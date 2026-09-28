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
const PER_CATEGORY = 12 // 한 카테고리가 목록을 독차지하지 않게 상한을 둔다
const MAX_RUN_DAYS = 92 // 기간 상한 — 3개월

// 관람하고 나서 이야기할 수 있는 행사만 담는다.
// 서울 API 에는 "DDP 건축투어", "하수처리장 견학" 같은 교육/체험이 가장 많은데(128건),
// 모여봄은 "같은 걸 보고 여운이 식기 전에 모인다"는 서비스라 성격이 맞지 않는다.
const VIEWABLE = new Set([
  '전시/미술',
  '연극',
  '뮤지컬/오페라',
  '클래식',
  '국악',
  '무용',
  '콘서트',
  '영화',
  '독주/독창회',
  '축제-문화/예술',
  '축제-전통/역사',
  '축제-자연/경관',
  '축제-시민화합',
  '축제-기타',
])

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

// 제목 앞에 주최 기관이 대괄호로 붙어 온다 — "[서울시립 북서울미술관] 2026 타이틀 매치".
// 목록에서는 작품명이 먼저 읽혀야 하므로 떼어내고, 뗀 이름은 organizer 로 살린다.
function splitOrganizer(rawTitle = '') {
  const m = rawTitle.trim().match(/^[[(【]([^\])】]{2,40})[\])】]\s*(.+)$/)
  if (!m) return { title: rawTitle.trim(), bracket: '' }
  const [, bracket, rest] = m
  // 떼고 나서 남는 게 너무 짧으면 그 대괄호는 기관명이 아니라 제목의 일부다
  return rest.trim().length >= 4 ? { title: rest.trim(), bracket: bracket.trim() } : { title: rawTitle.trim(), bracket: '' }
}

// ORG_NAME 이 기관 이름이 아니라 분류값("기타", "민간")으로 들어오는 행이 많다
const ORG_PLACEHOLDER = new Set(['기타', '민간', '개인', '공공', '없음', '-'])
function normalizeOrganizer(value) {
  const name = (value || '').trim()
  return ORG_PLACEHOLDER.has(name) ? '' : name
}

// 장소에 이미 기관 이름이 들어 있는 경우가 많다 ("노화랑 1,2층 전시장" ↔ "노화랑").
// 그대로 두면 같은 이름이 두 줄에 걸쳐 반복된다.
function isRedundant(organizer, venue) {
  const squash = (v) => (v || '').replace(/[\s·()[\]]/g, '')
  const o = squash(organizer)
  const p = squash(venue)
  if (!o || !p) return false
  return p.includes(o) || o.includes(p)
}

// 러닝타임과 회차는 서울 문화행사 API 가 주지 않는다.
// 시안 v2 가 "150분", "화~금 19:30 · 토·일 14:00, 18:30" 처럼 쓰고 있어
// 카테고리별 그럴듯한 기본값으로 채운다. 실제 값은 KOPIS 같은 공연 API 를
// 붙여야 나오므로, 목업이라는 점을 화면에서도 숨기지 않는다.
const RUNTIME_BY_CATEGORY = {
  연극: 110,
  '뮤지컬/오페라': 150,
  클래식: 100,
  국악: 90,
  무용: 80,
  콘서트: 120,
  영화: 105,
  '독주/독창회': 90,
}

// 회차형(같은 공연을 여러 번) 인 분류. 전시·축제는 상시 관람이라 회차가 없다.
const SERIES_CATEGORIES = new Set([
  '연극',
  '뮤지컬/오페라',
  '클래식',
  '국악',
  '무용',
  '콘서트',
  '독주/독창회',
])

const SCHEDULE_SAMPLES = [
  '화–금 19:30 · 토·일 14:00, 18:30',
  '수–금 20:00 · 주말 15:00, 19:00',
  '목–금 19:30 · 토 14:00, 18:00 · 일 15:00',
  '금 19:30 · 토·일 14:00',
]

function mapRow(row, index) {
  const codename = row.CODENAME || '기타'
  const { lat, lng } = normalizeCoords(row.LOT, row.LAT)
  const startAt = parseDate(row.STRTDATE)
  const endAt = parseDate(row.END_DATE)
  const { title, bracket } = splitOrganizer(row.TITLE || '')
  const venue = (row.PLACE || '').trim()
  const organizer = normalizeOrganizer(row.ORG_NAME) || bracket

  return {
    _id: `evt-${String(index + 1).padStart(3, '0')}`,
    sourceId: `seoul:${row.TITLE}|${row.STRTDATE}|${row.PLACE}`.slice(0, 300),
    title,
    // ORG_NAME 이 있으면 그쪽이 정확하다. 없을 때만 제목에서 뗀 대괄호를 쓴다.
    // 다만 ORG_NAME 에는 "기타" 같은 분류값이 들어오는 경우가 많아 기관명으로 못 쓴다.
    organizer: isRedundant(organizer, venue) ? '' : organizer,
    category: codename,
    genres: GENRE_MAP[codename] || GENRE_MAP['기타'],
    venue,
    address: venue,
    area: (row.GUNAME || '').trim(),
    coords: { lat, lng },
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    price: row.IS_FREE === '무료' ? '무료' : (row.USE_FEE || '').trim(),
    posterUrl: (row.MAIN_IMG || '').trim(),
    detailUrl: (row.ORG_LINK || row.HMPG_ADDR || '').trim(),

    // ── 아래는 API 에 없는 값이라 목업으로 채운다 ──
    runtimeMin: RUNTIME_BY_CATEGORY[codename] || null,
    isSeries: SERIES_CATEGORIES.has(codename),
    schedule: SERIES_CATEGORIES.has(codename)
      ? SCHEDULE_SAMPLES[index % SCHEDULE_SAMPLES.length]
      : '',
    // 찜 수 — 화면에 숫자가 있어야 버튼이 비어 보이지 않는다
    likeCount: 12 + ((index * 37) % 260),
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
  const DAY = 24 * 60 * 60 * 1000
  const dropped = { noPoster: 0, ended: 0, notViewable: 0, tooLong: 0, badDate: 0 }

  const usable = rows
    .map((row, i) => mapRow(row, i))
    .filter((e) => {
      if (!e.title || !e.startAt) return false
      // 포스터가 없으면 목록이 비어 보인다. 이미지가 있는 것만 남긴다
      if (!e.posterUrl) return (dropped.noPoster++, false)
      // 관람하고 나서 이야기할 수 있는 행사만 (교육/체험 등 제외)
      if (!VIEWABLE.has(e.category)) return (dropped.notViewable++, false)

      const start = new Date(e.startAt).getTime()
      const end = e.endAt ? new Date(e.endAt).getTime() : start
      // 종료일이 시작일보다 빠른 데이터가 섞여 있다 (연도 오류). 믿을 수 없으니 버린다
      if (end < start) return (dropped.badDate++, false)
      // 이미 끝난 행사는 화면에서 걸러지므로 애초에 담지 않는다
      if (end < now) return (dropped.ended++, false)
      // 1년짜리 상설전은 "여운이 식기 전에 모인다"와 어울리지 않는다
      if (end - start > MAX_RUN_DAYS * DAY) return (dropped.tooLong++, false)
      return true
    })
    // 지금 볼 수 있는 것을 앞에 둔다. 시작일 순으로만 두면 작년에 시작해 아직 하는
    // 행사가 맨 앞에 와서, 목록 첫 화면이 "오래된 것"으로 채워진다
    .sort((a, b) => {
      const running = (e) => (new Date(e.startAt).getTime() <= now ? 0 : 1)
      if (running(a) !== running(b)) return running(a) - running(b)
      // 진행 중인 것은 곧 끝나는 순, 예정인 것은 곧 시작하는 순
      return running(a) === 0
        ? new Date(a.endAt || a.startAt) - new Date(b.endAt || b.startAt)
        : new Date(a.startAt) - new Date(b.startAt)
    })

  console.log(
    `
거른 것 — 포스터 없음 ${dropped.noPoster} · 관람형 아님 ${dropped.notViewable} · ` +
      `종료 ${dropped.ended} · 3개월 초과 ${dropped.tooLong} · 날짜 오류 ${dropped.badDate}`,
  )
  console.log(`남은 후보 ${usable.length}건`)

  // 카테고리가 한쪽으로 쏠리면 필터를 걸어 볼 게 없어진다
  const byCategory = new Map()
  const picked = []
  for (const e of usable) {
    const count = byCategory.get(e.category) || 0
    if (count >= PER_CATEGORY) continue
    byCategory.set(e.category, count + 1)
    picked.push(e)
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
