import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SkeletonLoader from './SkeletonLoader'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { initialized } = useAuth()

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 dark:text-white">
        <SkeletonLoader lines={4} />
      </div>
    )
  }

  return <>{children}</>
}
