import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { checkForLocalStorageData } from '../lib/migrateLocalStorage'

interface AuthContextValue {
  user: User | null
  session: Session | null
  initialized: boolean
  showMigrationPrompt: boolean
  migrationError: string | null
  isMigrating: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  completeMigration: () => Promise<void>
  skipMigration: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [migrationError] = useState<string | null>(null)
  const [isMigrating] = useState(false)
  const migrationCheckedRef = useRef(false)

  const checkMigrationStatus = async (currentUser: User) => {
    if (migrationCheckedRef.current) return
    migrationCheckedRef.current = true

    if (currentUser.user_metadata?.migrated === true) return

    const hasData = checkForLocalStorageData()
    if (!hasData) {
      await supabase.auth.updateUser({ data: { migrated: true } })
      return
    }

    setShowMigrationPrompt(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setInitialized(true)

      if (session?.user) {
        checkMigrationStatus(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setInitialized(true)

      if (event === 'SIGNED_IN' && session?.user) {
        migrationCheckedRef.current = false
        checkMigrationStatus(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const completeMigration = async () => {
    if (!user) return
    setIsMigrating(true)
    setMigrationError(null)

    const { success, error } = await migrateToSupabase(user.id)

    setIsMigrating(false)

    if (success) {
      setShowMigrationPrompt(false)
    } else {
      setMigrationError(error ?? 'Migration failed')
    }
  }

  const skipMigration = () => {
    setShowMigrationPrompt(false)
  }

  return (
    <AuthContext.Provider value={{
      user, session, initialized,
      showMigrationPrompt, migrationError, isMigrating,
      signIn, signUp, signOut,
      completeMigration, skipMigration,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
