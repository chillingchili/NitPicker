/**
 * Migration utility: localStorage → Supabase
 *
 * Run in Supabase SQL Editor to create required tables:
 *
 * CREATE TABLE mock_exam_sessions (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid REFERENCES auth.users(id) NOT NULL,
 *   session_data jsonb NOT NULL,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE mock_exam_results (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid REFERENCES auth.users(id) NOT NULL,
 *   result_data jsonb NOT NULL,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * ALTER TABLE mock_exam_sessions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can manage their own sessions" ON mock_exam_sessions
 *   FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can manage their own results" ON mock_exam_results
 *   FOR ALL USING (auth.uid() = user_id);
 */

import { supabase } from '../lib/supabase'
import {
  loadMockExamSession,
  loadMockExamResult,
  clearMockExamSession,
  clearMockExamResult,
} from '../exam/mockExamModel'

const SESSION_STORAGE_KEY = 'ofa.mockExam.currentSession'
const RESULT_STORAGE_KEY = 'ofa.mockExam.latestResult'

export function checkForLocalStorageData(): boolean {
  try {
    const hasSession = localStorage.getItem(SESSION_STORAGE_KEY) !== null
    const hasResult = localStorage.getItem(RESULT_STORAGE_KEY) !== null
    return hasSession || hasResult
  } catch {
    return false
  }
}

export async function migrateToSupabase(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = loadMockExamSession()
    const result = loadMockExamResult()

    if (session) {
      const { error: sessionError } = await supabase
        .from('mock_exam_sessions')
        .insert({
          user_id: userId,
          session_data: session as unknown as Record<string, unknown>,
        })

      if (sessionError) {
        return { success: false, error: `Failed to migrate session: ${sessionError.message}` }
      }
    }

    if (result) {
      const { error: resultError } = await supabase
        .from('mock_exam_results')
        .insert({
          user_id: userId,
          result_data: result as unknown as Record<string, unknown>,
        })

      if (resultError) {
        return { success: false, error: `Failed to migrate result: ${resultError.message}` }
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { migrated: true },
    })

    if (updateError) {
      return { success: false, error: `Failed to update user metadata: ${updateError.message}` }
    }

    clearMockExamSession()
    clearMockExamResult()

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown migration error'
    return { success: false, error: message }
  }
}
