// 백엔드 API 공통 설정
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// GET 요청을 보내고 JSON으로 파싱, 실패 시 에러를 던지는 공통 헬퍼
export async function apiGet(path, { params } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  let res
  try {
    res = await fetch(url, { credentials: 'include' })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message = body?.message || `요청에 실패했습니다 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return body
}

// POST 요청(JSON body)을 보내고 결과를 파싱, 실패 시 에러를 던지는 공통 헬퍼
export async function apiPost(path, body) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
  }

  const responseBody = await res.json().catch(() => null)

  if (!res.ok) {
    const message = responseBody?.message || `요청에 실패했습니다 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return responseBody
}

// PATCH 요청(JSON body)을 보내고 결과를 파싱, 실패 시 에러를 던지는 공통 헬퍼
export async function apiPatch(path, body) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
  }

  const responseBody = await res.json().catch(() => null)

  if (!res.ok) {
    const message = responseBody?.message || `요청에 실패했습니다 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return responseBody
}

// DELETE 요청(JSON body)을 보내고 결과를 파싱, 실패 시 에러를 던지는 공통 헬퍼
export async function apiDelete(path, body) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
  }

  const responseBody = await res.json().catch(() => null)

  if (!res.ok) {
    const message = responseBody?.message || `요청에 실패했습니다 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return responseBody
}

// POST 요청(FormData, 파일 업로드 등)을 보내고 결과를 파싱, 실패 시 에러를 던지는 공통 헬퍼
export async function apiPostForm(path, formData) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.')
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message = body?.message || `요청에 실패했습니다 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    error.fieldErrors = body?.fieldErrors
    throw error
  }

  return body
}
