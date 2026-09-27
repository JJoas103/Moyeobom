import { createContext, useContext, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../api'

// 인증 컨텍스트
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true) // 최초 세션 확인 중인지

  useEffect(() => {
    let cancelled = false
    apiGet('/api/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 로그인 핸들러
  const login = async (email, password) => {
    const data = await apiPost('/api/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }

  // 로그아웃 핸들러
  const logout = async () => {
    await apiPost('/api/auth/logout')
    setUser(null)
  }

  // 사용자 정보 갱신 핸들러
  const refreshUser = async () => {
    try {
      const data = await apiGet('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}

// 인증 컨텍스트 사용
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }
  return context
}
