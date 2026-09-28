// 서울 열린데이터광장 문화행사(culturalEventInfo)를 받아 목업 파일을 만든다.
//
//   npm run mock:events
//
// 인증키는 Moyeobom-main/.env 의 SEOUL_RTD_API 에서 읽는다.
// 키가 없으면 sample 키로 떨어지는데, 샘플은 한 번에 5건까지만 준다.
// 키 발급: https://data.seoul.go.kr — 무료, 즉시
//
// 변환 로직은 services/eventApiService.js 와 똑같이 맞춘다. 필드가 어긋나면
// 나중에 USE_MOCK 을 끄고 실제 API 로 넘어갈 때 화면이 깨진다.

import { writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..') // Moyeobom-main
const OUT = path.resolve(HERE, '..', 'src', 'data', 'mock', 'events.generated.json')

const PAGE_SIZE = 1000
const MAX_PAGES = 8
const TARGET = 90 // 목업에 남길 건수
const PER_CATEGORY = 9 // 한 카테고리가 목록을 독차지하지 않게 상한을 둔다

// services/eventApiService.js 의 GENRE_MAP 과 같은 표
const GENRE_MAP = {
  연극: ['연극', '공연'],
  '뮤지컬/오페라': ['뮤지컬', '오페라', '공연'],
  클래식: ['클래식', '음악', '공연'],
  국악: ['국악', '음악', '공연'],
  무용: ['무용', '공연'],
  콘서트: ['콘서트', '음악', '공연'],
  '독주/독창회': ['클래식', '음악', '공연'],
  '전시/미술': ['전시', '미술'],
  영화: ['영화'],
  '축제-문화/예술': ['축제', '문화'],
  '축제-전통/역사': ['축제', '역사'],
  '축제-자연/경관': ['축제', '자연'],
  '축제-시민화합': ['축제', '문화'],
  '축제-기타': ['축제'],
  '교육/체험': ['체험', '교육'],
  기타: ['문화'],
}

// 서울 API 의 LOT/LAT 는 데이터셋에 따라 뒤바뀌어 들어온다.
// 서울 위경도 범위로 판별해 바로잡는다.
function normalizeCoords(rawLot, rawLat) {
  const a = parseFloat(rawLot)
  const b = parseFloat(rawLat)
  if (!isFinite(a) || !isFinite(b)) return { lat: null, lng: null }

  const isLat = (v) => v > 37 && v < 38
  const isLng = (v) => v > 126 && v < 128

  if (isLat(a) && isLng(b)) return { lat: a, lng: b }
  if (isLat(b) && isLng(a)) return { lat: b, lng: a }
  return { lat: null, lng: null }
}

// 서울 API 는 "2026-11-15 00:00:00.0" 형태로 준다.
// 그대로 new Date() 에 넣으면 환경에 따라 UTC 로 읽혀 9시간이 밀린다.
// 숫자를 뜯어 로컬 시각으로 만든다.
function parseDate(value) {
  if (!value) return null
  const m = String(value)
    .trim()
    .match(/^(\d{4})[-.](\d{2})[-.](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  const [, y, mo, d, hh = '0', mi = '0', ss = '0'] = m
  const date = new Date(+y, +mo - 1, +d, +hh, +mi, +ss)
  return isNaN(date.getTime()) ? null : date
}

function mapRow(row, index) {
  const codename = row.CODENAME || '기타'
  const { lat, lng } = normalizeCoords(row.LOT, row.LAT)
  const startAt = parseDate(row.STRTDATE)
  const endAt = parseDate(row.END_DATE)

  return {
    _id: `evt-${String(index + 1).padStart(3, '0')}`,
    sourceId: `seoul:${row.TITLE}|${row.STRTDATE}|${row.PLACE}`.slice(0, 300),
    title: (row.TITLE || '').trim(),
    category: codename,
    genres: GENRE_MAP[codename] || GENRE_MAP['기타'],
    venue: (row.PLACE || '').trim(),
    address: (row.PLACE || '').trim(),
    area: (row.GUNAME || '').trim(),
    coords: { lat, lng },
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    price: row.IS_FREE === '무료' ? '무료' : (row.USE_FEE || '').trim(),
    posterUrl: (row.MAIN_IMG || '').trim(),
    detailUrl: (row.ORG_LINK || row.HMPG_ADDR || '').trim(),
  }
}

async function readKey() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return null
  const text = await readFile(envPath, 'utf-8')
  const match = text.match(/^\s*SEOUL_RTD_API\s*=\s*(.+)\s*$/m)
  const key = match?.[1]?.trim().replace(/^["']|["']$/g, '')
  return key || null
}

async function fetchPage(key, start, end) {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/culturalEventInfo/${start}/${end}/`
  const res = await fetch(url)
  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    // 오류는 XML 로 온다
    throw new Error(text.slice(0, 200))
  }

  const body = data.culturalEventInfo
  if (!body) throw new Error(JSON.stringify(data.RESULT || data).slice(0, 200))
  return body.row || []
}

async function main() {
  const key = (await readKey()) || 'sample'
  if (key === 'sample') {
    console.warn('SEOUL_RTD_API 키를 .env 에서 못 찾았습니다. sample 키로 진행합니다 (최대 5건).')
    console.warn('키 발급: https://data.seoul.go.kr → 인증키 신청 → .env 에 SEOUL_RTD_API=키\n')
  }

  const pageSize = key === 'sample' ? 5 : PAGE_SIZE
  const maxPages = key === 'sample' ? 1 : MAX_PAGES

  const rows = []
  for (let page = 0; page < maxPages; page++) {
    const start = page * pageSize + 1
    const end = start + pageSize - 1
    let batch
    try {
      batch = await fetchPage(key, start, end)
    } catch (err) {
      console.error(`${start}~${end} 조회 실패: ${err.message}`)
      break
    }
    if (batch.length === 0) break
    rows.push(...batch)
    console.log(`  ${start}~${end} 수신 ${batch.length}건 (누적 ${rows.length})`)
    if (batch.length < pageSize) break
  }

  if (rows.length === 0) {
    console.error('받은 행사가 없습니다. 목업을 바꾸지 않고 종료합니다.')
    process.exit(1)
  }

  const now = Date.now()
  const usable = rows
    .map((row, i) => ({ row, mapped: mapRow(row, i) }))
    .filter(({ mapped }) => {
      if (!mapped.title || !mapped.startAt) return false
      // 포스터가 없으면 목록이 비어 보인다. 이미지가 있는 것만 남긴다
      if (!mapped.posterUrl) return false
      // 이미 끝난 행사는 화면에서 걸러지므로 애초에 담지 않는다
      const end = mapped.endAt ? new Date(mapped.endAt).getTime() : new Date(mapped.startAt).getTime()
      return end >= now
    })
    .sort((a, b) => new Date(a.mapped.startAt) - new Date(b.mapped.startAt))

  // 카테고리가 한쪽으로 쏠리면 필터를 걸어 볼 게 없어진다
  const byCategory = new Map()
  const picked = []
  for (const { mapped } of usable) {
    const count = byCategory.get(mapped.category) || 0
    if (count >= PER_CATEGORY) continue
    byCategory.set(mapped.category, count + 1)
    picked.push(mapped)
    if (picked.length >= TARGET) break
  }

  // _id 를 1번부터 다시 매긴다 (목업의 모임·감상이 evt-001 식으로 참조한다)
  const events = picked.map((e, i) => ({ ...e, _id: `evt-${String(i + 1).padStart(3, '0')}` }))

  await writeFile(OUT, JSON.stringify(events, null, 2) + '\n', 'utf-8')

  console.log(`\n저장: ${path.relative(ROOT, OUT)}`)
  console.log(`  ${events.length}건 · 카테고리 ${byCategory.size}종`)
  for (const [cat, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat} ${n}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
