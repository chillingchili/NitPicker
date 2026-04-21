import type { QuestionPerformance, TopicMastery } from '../exam/mockExamModel';

// ─── Cache Constants ────────────────────────────────────────────────────────

export const SMART_EXAM_CACHE_KEY = 'ofa.smartExam.questionPerformances';
export const SMART_EXAM_TOGGLE_KEY = 'ofa.smartExam.excludeMastered';

// ─── Mastery Computation ────────────────────────────────────────────────────

/**
 * Returns question IDs where correctCount >= threshold (default 3 per EXAM-01).
 * These questions are considered "mastered" and can be excluded from exams.
 */
export function computeMasteredIds(
  performances: QuestionPerformance[],
  threshold: number = 3,
): Set<string> {
  return new Set(
    performances
      .filter((p) => p.correctCount >= threshold)
      .map((p) => p.questionId),
  );
}

/**
 * Aggregates individual question performances by topic using the provided
 * questionTopicMap, computing correctRatio and masteryLevel per topic.
 *
 * Mastery levels:
 *   0  → no data (no questions attempted for this topic)
 *   25 → 0-25% correct ratio
 *   50 → 26-50% correct ratio
 *   75 → 51-75% correct ratio
 *  100 → 76-100% correct ratio
 */
export function computeTopicMastery(
  performances: QuestionPerformance[],
  questionTopicMap: Map<string, string>,
): TopicMastery[] {
  // Aggregate per topic
  const topicAggregation = new Map<string, { correct: number; incorrect: number }>();

  for (const perf of performances) {
    const topic = questionTopicMap.get(perf.questionId) ?? 'Unknown';
    const existing = topicAggregation.get(topic) ?? { correct: 0, incorrect: 0 };
    existing.correct += perf.correctCount;
    existing.incorrect += perf.incorrectCount;
    topicAggregation.set(topic, existing);
  }

  const results: TopicMastery[] = [];

  for (const [topic, agg] of topicAggregation) {
    const total = agg.correct + agg.incorrect;
    const correctRatio = total > 0 ? agg.correct / total : 0;
    const pct = total > 0 ? (agg.correct / total) * 100 : 0;

    let masteryLevel: 0 | 25 | 50 | 75 | 100;
    if (total === 0) {
      masteryLevel = 0;
    } else if (pct <= 25) {
      masteryLevel = 25;
    } else if (pct <= 50) {
      masteryLevel = 50;
    } else if (pct <= 75) {
      masteryLevel = 75;
    } else {
      masteryLevel = 100;
    }

    results.push({
      topic,
      correctCount: agg.correct,
      incorrectCount: agg.incorrect,
      correctRatio,
      masteryLevel,
    });
  }

  return results;
}

// ─── Mastery Color Mapping ──────────────────────────────────────────────────

// 4-tier blue gradient matching the dashboard heatmap in progressdashboard.tsx
const MASTERY_COLORS: Record<number, { light: string; dark: string }> = {
  0: { light: 'bg-gray-200 dark:bg-zinc-800', dark: 'bg-gray-200 dark:bg-zinc-800' },
  25: { light: 'bg-blue-200 dark:bg-blue-900/40', dark: 'bg-blue-200 dark:bg-blue-900/40' },
  50: { light: 'bg-blue-300 dark:bg-blue-800/50', dark: 'bg-blue-300 dark:bg-blue-800/50' },
  75: { light: 'bg-blue-400 dark:bg-blue-700/60', dark: 'bg-blue-400 dark:bg-blue-700/60' },
  100: { light: 'bg-blue-500 dark:bg-blue-600/70 text-white', dark: 'bg-blue-500 dark:bg-blue-600/70 text-white' },
};

/**
 * Returns Tailwind-compatible color class for the 4-tier blue gradient
 * matching the dashboard heatmap. For dark mode, the classes already
 * include dark: variants.
 */
export function getMasteryColor(level: number): string {
  return MASTERY_COLORS[level]?.light ?? MASTERY_COLORS[0].light;
}