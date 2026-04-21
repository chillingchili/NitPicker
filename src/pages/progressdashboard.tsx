import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAuth } from '../contexts/AuthContext'
import { useProgressData, type TopicMasteryData, type CoverageData } from '../hooks/useProgressData'
import { categoryTopics, type CategoryName } from '../exam/mockExamModel'
import { Check, Minus } from 'lucide-react'

function getMasteryCellClass(pct: number, attempted: boolean): string {
  if (!attempted) return 'bg-gray-200 dark:bg-zinc-800'
  if (pct < 25) return 'bg-blue-200 dark:bg-blue-900/40'
  if (pct < 50) return 'bg-blue-300 dark:bg-blue-800/50'
  if (pct < 75) return 'bg-blue-400 dark:bg-blue-700/60'
  return 'bg-blue-500 dark:bg-blue-600/70 text-white'
}

export default function ProgressDashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useProgressData()
  const navigate = useNavigate()

  // Auth guard: redirect if not logged in
  if (!user) {
    return (
      <Layout className="gap-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <h1 className="text-3xl font-bold text-black dark:text-white">Progress Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            Log in to track your progress and see your mastery heatmap.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </Layout>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Layout className="gap-8 py-10">
        <div className="w-full max-w-4xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <SkeletonLoader lines={1} />
            <SkeletonLoader lines={1} />
          </div>
          <SkeletonLoader lines={6} />
          <SkeletonLoader lines={4} />
        </div>
      </Layout>
    )
  }

  // Error state
  if (error) {
    return (
      <Layout className="gap-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Something went wrong</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </Layout>
    )
  }

  // Empty state — no exams completed yet
  if (data && data.totalExams === 0) {
    return (
      <Layout className="gap-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <h1 className="text-3xl font-bold text-black dark:text-white">Your Progress</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md">
            Take your first exam to see your progress!
          </p>
          <button
            type="button"
            onClick={() => navigate('/mockexamprep')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Start an Exam
          </button>
        </div>
      </Layout>
    )
  }

  if (!data) return null

  // Build lookup maps for quick topic access
  const masteryMap = new Map(data.topicMastery.map((m) => [m.topic, m]))
  const coverageMap = new Map(data.coverage.map((c) => [c.topic, c]))

  const handleHeatmapClick = (topic: string) => {
    navigate(`/mockexamprep?topic=${encodeURIComponent(topic)}`)
  }

  return (
    <Layout className="gap-8 py-10">
      <div className="w-full max-w-4xl mx-auto px-4 space-y-12">

        {/* Section 1 — Hero */}
        <section className="text-center space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-black dark:text-white">Your Progress</h1>
          <div className="text-6xl lg:text-7xl font-bold text-black dark:text-white">
            {data.overallScorePct !== null ? `${data.overallScorePct}%` : '—'}
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Average Score
          </p>
          <p className="text-zinc-500 dark:text-zinc-500">
            {data.totalExams} {data.totalExams === 1 ? 'exam' : 'exams'} completed
          </p>
        </section>

        {/* Section 2 — Topic Mastery Heatmap */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">Topic Mastery</h2>
          {(Object.keys(categoryTopics) as CategoryName[]).map((category) => {
            const topics = categoryTopics[category]
            return (
              <div key={category} className="space-y-2">
                <h3 className="text-lg font-semibold text-black dark:text-white">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {topics.map((topic) => {
                    const mastery = masteryMap.get(topic)
                    const pct = mastery?.correctPct ?? 0
                    const attempted = mastery?.attempted ?? false

                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleHeatmapClick(topic)}
                        className={`p-3 rounded border border-black/10 dark:border-white/10 text-left transition-colors hover:opacity-80 ${getMasteryCellClass(pct, attempted)}`}
                      >
                        <p className="text-xs truncate text-black/70 dark:text-white/70">{topic}</p>
                        <p className={`text-lg font-bold ${attempted ? '' : 'text-black/40 dark:text-white/40'}`}>
                          {attempted ? `${pct}%` : '—'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>

        {/* Section 3 — Coverage Map */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">Exam Coverage</h2>
          {(Object.keys(categoryTopics) as CategoryName[]).map((category) => {
            const topics = categoryTopics[category]
            return (
              <div key={category} className="space-y-1">
                <h3 className="text-lg font-semibold text-black dark:text-white">{category}</h3>
                <ul className="space-y-1">
                  {topics.map((topic) => {
                    const coverage = coverageMap.get(topic)
                    const isAttempted = coverage?.attempted ?? false
                    return (
                      <li key={topic} className="flex items-center gap-2 text-sm">
                        {isAttempted ? (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400 dark:text-zinc-600 shrink-0" />
                        )}
                        <span className={`${isAttempted ? 'text-black dark:text-white' : 'text-gray-400 dark:text-zinc-600'}`}>
                          {topic}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </section>

      </div>
    </Layout>
  )
}