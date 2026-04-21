import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { safeSave, safeLoad, type QuestionPerformance } from '../exam/mockExamModel';

const CACHE_KEY = 'ofa.smartExam.questionPerformances';

export type UseQuestionPerformanceReturn = {
  performances: QuestionPerformance[];
  isLoading: boolean;
  refetch: () => void;
};

export function useQuestionPerformance(): UseQuestionPerformanceReturn {
  const { user } = useAuth();
  const [performances, setPerformances] = useState<QuestionPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setPerformances([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Load from cache first for instant display
      const cached = safeLoad<QuestionPerformance[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setPerformances(cached);
      }

      // Fetch fresh data from Supabase in background
      const { data, error } = await supabase
        .from('question_performance')
        .select('question_id, correct_count, incorrect_count')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch question performance:', error.message);
        return;
      }

      const mapped: QuestionPerformance[] = (data ?? []).map((row) => ({
        questionId: row.question_id,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
        confidence: null,
        lastAnsweredAt: new Date(),
      }));

      setPerformances(mapped);
      safeSave(CACHE_KEY, mapped);
    } catch (err) {
      console.error('Failed to fetch question performance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { performances, isLoading, refetch: fetchData };
}