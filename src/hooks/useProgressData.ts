import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { categoryTopics, type CategoryName } from '../exam/mockExamModel';
import { getQuestionTopicMap, resolveQuestionTopic, getTopicQuestionCounts } from '../exam/mockExamQuestionBank';

// Types
export type TopicMasteryData = {
  topic: string;
  category: CategoryName;
  correctCount: number;
  incorrectCount: number;
  correctPct: number;
  attempted: boolean;
};

export type CoverageData = {
  topic: string;
  category: CategoryName;
  attempted: boolean;
};

export type ScoreHistoryPoint = {
  date: string;
  scorePct: number;
  totalQuestions: number;
  correctAnswers: number;
};

export type RetentionData = {
  topic: string;
  correctPct: number;
  attempted: boolean;
};

export type ProgressData = {
  topicMastery: TopicMasteryData[];
  coverage: CoverageData[];
  scoreHistory: ScoreHistoryPoint[];
  retention: RetentionData[];
  overallScorePct: number | null;
  totalExams: number;
};

export type UseProgressDataReturn = {
  data: ProgressData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const findCategory = (topic: string): CategoryName => {
  const entries = Object.entries(categoryTopics) as unknown as [string, string[]][];
  for (const [cat, topics] of entries) {
    if (topics.includes(topic)) {
      return cat as CategoryName;
    }
  }
  return 'Technology' as CategoryName;
};

export function useProgressData(): UseProgressDataReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const fetchData = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [sessionsResult, performanceResult] = await Promise.all([
        supabase
          .from('exam_sessions')
          .select('created_at, score, total_questions, correct_answers')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('question_performance')
          .select('question_id, correct_count, incorrect_count, last_answered_at')
          .eq('user_id', userId),
      ]);

      if (sessionsResult.error) {
        throw new Error(sessionsResult.error.message);
      }
      if (performanceResult.error) {
        throw new Error(performanceResult.error.message);
      }

      const sessions = sessionsResult.data ?? [];
      const performances = performanceResult.data ?? [];

      // Get question → topic mapping and total questions per topic
      const topicMap = getQuestionTopicMap();
      const topicCounts = getTopicQuestionCounts();

      // Aggregate question performance by topic
      const topicAggregation = new Map<string, { correct: number; incorrect: number }>();
      for (const perf of performances) {
        const topic = resolveQuestionTopic(perf.question_id, topicMap);
        const existing = topicAggregation.get(topic) ?? { correct: 0, incorrect: 0 };
        existing.correct += perf.correct_count;
        existing.incorrect += perf.incorrect_count;
        topicAggregation.set(topic, existing);
      }

      // Build topic mastery data for all topics
      // Mastery % = correct / total_questions_in_topic (not just attempted)
      const allTopicNames = Object.values(categoryTopics).flat();
      const topicMastery: TopicMasteryData[] = allTopicNames.map((topic) => {
        const agg = topicAggregation.get(topic);
        const totalInTopic = topicCounts.get(topic) ?? 0;
        const correct = agg?.correct ?? 0;
        const incorrect = agg?.incorrect ?? 0;
        const totalAttempted = correct + incorrect;
        const attempted = totalAttempted > 0;
        return {
          topic,
          category: findCategory(topic),
          correctCount: correct,
          incorrectCount: incorrect,
          correctPct: totalInTopic > 0 ? Math.round((correct / totalInTopic) * 100) : 0,
          attempted,
        };
      });

      // Build coverage data
      const coverage: CoverageData[] = allTopicNames.map((topic) => ({
        topic,
        category: findCategory(topic),
        attempted: topicAggregation.has(topic),
      }));

      // Build score history
      const scoreHistory: ScoreHistoryPoint[] = sessions.map((s, index) => {
        const date = new Date(s.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date: sessions.filter((_, i) => {
            const d = new Date(_.created_at);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr;
          }).length > 1
            ? `${dateStr} #${index + 1}`
            : dateStr,
          scorePct: s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0,
          totalQuestions: s.total_questions,
          correctAnswers: s.correct_answers,
        };
      });

      // Build retention data (sorted weakest first)
      const retention: RetentionData[] = allTopicNames
        .map((topic) => {
          const agg = topicAggregation.get(topic);
          const total = (agg?.correct ?? 0) + (agg?.incorrect ?? 0);
          return {
            topic,
            correctPct: total > 0 ? Math.round(((agg?.correct ?? 0) / total) * 100) : 0,
            attempted: total > 0,
          };
        })
        .sort((a, b) => {
          if (a.attempted && !b.attempted) return -1;
          if (!a.attempted && b.attempted) return 1;
          return a.correctPct - b.correctPct;
        });

      // Overall score
      const overallScorePct = sessions.length > 0
        ? Math.round(
            sessions.reduce((sum, s) => sum + (s.total_questions > 0 ? s.correct_answers / s.total_questions : 0), 0) /
            sessions.length * 100
          )
        : null;

      setData({
        topicMastery,
        coverage,
        scoreHistory,
        retention,
        overallScorePct,
        totalExams: sessions.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load progress data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}