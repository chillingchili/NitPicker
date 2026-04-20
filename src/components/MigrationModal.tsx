import LoadingSpinner from './LoadingSpinner'

type MigrationModalProps = {
  isOpen: boolean
  onMigrate: () => void
  onSkip: () => void
  isMigrating: boolean
  error: string | null
}

export default function MigrationModal({
  isOpen,
  onMigrate,
  onSkip,
  isMigrating,
  error,
}: MigrationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-white">
        <h2 className="mb-2 text-xl font-semibold">We found existing progress</h2>
        <p className="mb-6 text-sm opacity-80">
          It looks like you have exam progress saved locally. Would you like to migrate it to your
          account so it&apos;s available on any device?
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {isMigrating ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner label="Migrating your progress..." />
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onMigrate}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            >
              Migrate
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-900"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
