import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type React from 'react'
import { insforge } from '@/lib/insforge'
import type { Profile } from '@/types'

interface User {
  id: string
  email: string
  profile: Profile | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
  isAdmin: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select()
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as Profile
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (error || !data?.user) {
        setUser(null)
        return
      }
      const profile = await fetchProfile(data.user.id)
      setUser({
        id: data.user.id,
        email: data.user.email,
        profile,
      })
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message || 'Credenciales invalidas' }
    }
    if (data?.user) {
      const profile = await fetchProfile(data.user.id)
      setUser({
        id: data.user.id,
        email: data.user.email,
        profile,
      })
    }
    return {}
  }

  const signOut = async () => {
    await insforge.auth.signOut()
    setUser(null)
  }

  const isAdmin = user?.profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}
