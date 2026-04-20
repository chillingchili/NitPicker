export const categoryTopics = {
  Technology: [
    "Number Systems & Data Representation",
    "Applied Mathematics",
    "Discrete Math & Algorithms",
    "Computer Architecture & Hardware",
    "Operating Systems",
    "Digital Logic",
    "Computer Graphics",
    "Databases",
    "Networking",
    "Cybersecurity",
    "Software Engineering & Design",
    "Software Testing",
    "Emerging Technologies",
  ],
  Management: [
    "Project Management",
    "IT Service Management (ITSM)",
    "System Auditing",
    "Quality Management",
    "Corporate Finance",
  ],
  Strategy: [
    "Business Strategy",
    "System Strategy",
    "Law & Intellectual Property",
    "Digital Trends",
  ],
} as const;

export type CategoryName = keyof typeof categoryTopics;
export type ExamType = "AM EXAM" | "PM EXAM";

export const allTopics: string[] = Object.values(categoryTopics).flat();

export type MockExamSettings = {
  examType: ExamType;
  isTimed: boolean;
  durationMinutes: number;
  questionCount: number;
  instantAnswers: boolean;
  selectedTopics: string[];
  selectedYears: string[];
};

export type MockExamOption = {
  key: string;
  text: string;
  imagePath: string | null;
};

export type MockExamQuestion = {
  id: string;
  pdfName: string;
  sourceYear: string;
  questionNumber: string;
  questionText: string;
  tableText: string | null;
  questionImagePath: string | null;
  options: MockExamOption[];
  correctOption: string;
  answerExplanation: string | null;
  subjectCategory: string;
  subjectTopic: string;
};

export type MockExamSession = {
  schemaVersion: number;
  sessionId: string;
  createdAtMs: number;
  startedAtMs: number;
  settings: MockExamSettings;
  questions: MockExamQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  hintsUsed: number;
};

export type TopicBreakdown = {
  name: string;
  correct: number;
  total: number;
};

export type CategoryBreakdown = {
  name: string;
  correct: number;
  total: number;
  topics: TopicBreakdown[];
};

export type WrongQuestionReview = {
  id: string;
  sourceYear: string;
  questionNumber: string;
  subjectTopic: string;
  questionText: string;
  selectedOption: string | null;
  selectedOptionText: string | null;
  correctOption: string;
  correctOptionText: string | null;
  answerExplanation: string | null;
};

export type MockExamResult = {
  completedAtMs: number;
  settings: MockExamSettings;
  sourceYears: string[];
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSeconds: number;
  averageTimePerQuestionSeconds: number;
  hintsUsed: number;
  selectedCategories: string[];
  selectedTopicCount: number;
  categoryBreakdown: CategoryBreakdown[];
  wrongQuestions: WrongQuestionReview[];
};

const SESSION_STORAGE_KEY = "ofa.mockExam.currentSession";
const RESULT_STORAGE_KEY = "ofa.mockExam.latestResult";
const SESSION_SCHEMA_VERSION = 4;

const extractYearFromText = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const matchedYear = value.match(/\b(19|20)\d{2}\b/)?.[0];
  return matchedYear ?? null;
};

const resolveQuestionSourceYear = (question: Pick<MockExamQuestion, "id" | "pdfName" | "sourceYear">): string => {
  const explicitSourceYear = typeof question.sourceYear === "string" ? question.sourceYear.trim() : "";
  if (explicitSourceYear) {
    return explicitSourceYear;
  }

  return extractYearFromText(question.pdfName) ?? extractYearFromText(question.id) ?? "Unknown";
};

type LegacyWrongQuestionReview = Omit<WrongQuestionReview, "sourceYear"> & {
  sourceYear?: string;
};

type LegacyMockExamResult = Omit<MockExamResult, "sourceYears" | "wrongQuestions"> & {
  sourceYears?: string[];
  wrongQuestions?: LegacyWrongQuestionReview[];
};

const migrateMockExamResult = (result: LegacyMockExamResult): MockExamResult => {
  const normalizedWrongQuestions: WrongQuestionReview[] = (result.wrongQuestions ?? []).map((wrongQuestion) => ({
    ...wrongQuestion,
    sourceYear: extractYearFromText(wrongQuestion.sourceYear) ?? extractYearFromText(wrongQuestion.id) ?? "Unknown",
  }));

  const normalizedSourceYears = (result.sourceYears ?? [])
    .map((entry) => extractYearFromText(entry) ?? entry)
    .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));

  const sourceYears = (normalizedSourceYears.length > 0
    ? [...new Set(normalizedSourceYears)]
    : [...new Set(normalizedWrongQuestions.map((question) => question.sourceYear))]
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return {
    ...result,
    sourceYears,
    wrongQuestions: normalizedWrongQuestions,
  } as MockExamResult;
};

export const safeSave = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage failures and keep app functional.
  }
};

const safeLoad = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const isMockExamSession = (value: unknown): value is MockExamSession => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<MockExamSession>;

  return (
    session.schemaVersion === SESSION_SCHEMA_VERSION &&
    typeof session.sessionId === "string" &&
    typeof session.createdAtMs === "number" &&
    typeof session.startedAtMs === "number" &&
    typeof session.currentQuestionIndex === "number" &&
    typeof session.hintsUsed === "number" &&
    Boolean(session.settings) &&
    Array.isArray(session.settings?.selectedYears) &&
    Array.isArray(session.questions) &&
    Boolean(session.answers) &&
    typeof session.answers === "object"
  );
};

export const saveMockExamSession = (session: MockExamSession) => {
  safeSave(SESSION_STORAGE_KEY, session);
};

export const loadMockExamSession = (): MockExamSession | null => {
  const loaded = safeLoad<unknown>(SESSION_STORAGE_KEY);

  if (!isMockExamSession(loaded)) {
    clearMockExamSession();
    return null;
  }

  return loaded;
};

export const attachSessionSchema = (session: Omit<MockExamSession, "schemaVersion">): MockExamSession => ({
  ...session,
  schemaVersion: SESSION_SCHEMA_VERSION,
});

export const clearMockExamSession = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures and keep app functional.
  }
};

export const saveMockExamResult = (result: MockExamResult) => {
  safeSave(RESULT_STORAGE_KEY, result);
};

export const loadMockExamResult = (): MockExamResult | null => {
  const loaded = safeLoad<LegacyMockExamResult>(RESULT_STORAGE_KEY);

  if (!loaded || typeof loaded !== "object") {
    return null;
  }

  return migrateMockExamResult(loaded);
};

export const clearMockExamResult = () => {
  try {
    localStorage.removeItem(RESULT_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures and keep app functional.
  }
};

export const deriveSelectedCategories = (selectedTopics: string[]): string[] => {
  const selectedSet = new Set(selectedTopics);

  return (Object.keys(categoryTopics) as CategoryName[]).filter((categoryName) =>
    categoryTopics[categoryName].some((topic) => selectedSet.has(topic)),
  );
};

export const formatClockFromSeconds = (seconds: number, alwaysShowHours = true): string => {
  const clamped = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const remainingSeconds = clamped % 60;

  if (!alwaysShowHours && hours === 0) {
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const topicOrderMap = new Map<string, number>(allTopics.map((topic, index) => [topic, index]));

import { supabase } from "../lib/supabase";

export const saveExamSession = async (
  userId: string,
  session: MockExamSession,
  result: MockExamResult,
): Promise<void> => {
  try {
    const { error } = await supabase.from("exam_sessions").insert({
      user_id: userId,
      session_id: session.sessionId,
      settings: session.settings,
      score: result.correctAnswers,
      total_questions: result.totalQuestions,
      correct_answers: result.correctAnswers,
      duration_seconds: result.totalTimeSeconds,
    });

    if (error) {
      console.error("Failed to save exam session to Supabase:", error.message);
    }
  } catch (err) {
    console.error("Failed to save exam session to Supabase:", err);
  }
};

export const computeMockExamResult = (
  answers: Record<string, string>,
  totalTimeSeconds: number,
  hintsUsed: number,
): MockExamResult => {
  const totalQuestions = session.questions.length;

  let correctAnswers = 0;
  const wrongQuestions: WrongQuestionReview[] = [];

  const categoryStats = new Map<
    string,
    {
      name: string;
      total: number;
      correct: number;
      topics: Map<string, TopicBreakdown>;
    }
  >();

  for (const question of session.questions) {
    const selectedAnswer = answers[question.id];
    const isCorrect = selectedAnswer === question.correctOption;
    const sourceYear = resolveQuestionSourceYear(question);

    if (!isCorrect) {
      const selectedChoice = question.options.find((choice) => choice.key === selectedAnswer);
      const correctChoice = question.options.find((choice) => choice.key === question.correctOption);

      wrongQuestions.push({
        id: question.id,
        sourceYear,
        questionNumber: question.questionNumber,
        subjectTopic: question.subjectTopic,
        questionText: question.questionText,
        selectedOption: selectedAnswer ?? null,
        selectedOptionText: selectedChoice?.text?.trim() ? selectedChoice.text : null,
        correctOption: question.correctOption,
        correctOptionText: correctChoice?.text?.trim() ? correctChoice.text : null,
        answerExplanation: question.answerExplanation,
      });
    }

    if (isCorrect) {
      correctAnswers += 1;
    }

    const categoryName = question.subjectCategory;

    if (!categoryStats.has(categoryName)) {
      categoryStats.set(categoryName, {
        name: categoryName,
        total: 0,
        correct: 0,
        topics: new Map<string, TopicBreakdown>(),
      });
    }

    const category = categoryStats.get(categoryName);
    if (!category) {
      continue;
    }

    category.total += 1;
    if (isCorrect) {
      category.correct += 1;
    }

    const existingTopic = category.topics.get(question.subjectTopic) ?? {
      name: question.subjectTopic,
      total: 0,
      correct: 0,
    };

    existingTopic.total += 1;
    if (isCorrect) {
      existingTopic.correct += 1;
    }

    category.topics.set(question.subjectTopic, existingTopic);
  }

  const categoryBreakdown = [...categoryStats.values()]
    .sort((a, b) => {
      const aOrder = (Object.keys(categoryTopics) as string[]).indexOf(a.name);
      const bOrder = (Object.keys(categoryTopics) as string[]).indexOf(b.name);
      if (aOrder === -1 || bOrder === -1) {
        return a.name.localeCompare(b.name);
      }
      return aOrder - bOrder;
    })
    .map((category) => ({
      name: category.name,
      total: category.total,
      correct: category.correct,
      topics: [...category.topics.values()].sort((a, b) => {
        const aOrder = topicOrderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = topicOrderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
        if (aOrder === bOrder) {
          return a.name.localeCompare(b.name);
        }
        return aOrder - bOrder;
      }),
    }));

  const averageTimePerQuestionSeconds =
    totalQuestions === 0 ? 0 : Math.max(0, Math.round(totalTimeSeconds / totalQuestions));

  const sourceYears = [...new Set(session.questions.map((question) => resolveQuestionSourceYear(question)))]
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return {
    completedAtMs: Date.now(),
    settings: session.settings,
    sourceYears,
    totalQuestions,
    correctAnswers,
    totalTimeSeconds,
    averageTimePerQuestionSeconds,
    hintsUsed,
    selectedCategories: deriveSelectedCategories(session.settings.selectedTopics),
    selectedTopicCount: session.settings.selectedTopics.length,
    categoryBreakdown,
    wrongQuestions,
  };
};

// ─── Spaced Repetition (SM-2) ────────────────────────────────────────────────

import { supermemo } from 'supermemo';

const MAX_INTERVAL_DAYS = 30;

export type TopicSRState = {
  topic: string;
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
};

export type QuestionPerformance = {
  questionId: string;
  correctCount: number;
  incorrectCount: number;
  confidence: number | null;
  lastAnsweredAt: Date;
};

export type TopicSRStateUpdate = TopicSRState & { previousInterval: number };

export function computeTopicSRUpdate(
  questions: MockExamQuestion[],
  answers: Record<string, string>,
  existingStates: Map<string, TopicSRState>,
): TopicSRStateUpdate[] {
  // Group questions by topic
  const questionsByTopic = new Map<string, MockExamQuestion[]>();
  for (const q of questions) {
    const list = questionsByTopic.get(q.subjectTopic) ?? [];
    list.push(q);
    questionsByTopic.set(q.subjectTopic, list);
  }

  const updates: TopicSRStateUpdate[] = [];

  for (const [topic, topicQuestions] of questionsByTopic) {
    const existing = existingStates.get(topic);
    let interval = existing?.intervalDays ?? 0;
    let repetition = existing?.repetitions ?? 0;
    let efactor = existing?.easinessFactor ?? 2.5;
    const previousInterval = interval;

    // Apply SM-2 for each question in the topic (sequential state updates)
    for (const q of topicQuestions) {
      const isCorrect = answers[q.id] === q.correctOption;
      const grade = isCorrect ? 5 : 0;
      const result = supermemo({ interval, repetition, efactor }, grade);
      interval = result.interval;
      repetition = result.repetition;
      efactor = result.efactor;
    }

    // Cap interval at 30 days
    const cappedInterval = Math.min(interval, MAX_INTERVAL_DAYS);
    const now = new Date();
    const nextReviewDate = new Date(now.getTime() + cappedInterval * 86_400_000);

    updates.push({
      topic,
      easinessFactor: efactor,
      intervalDays: cappedInterval,
      repetitions: repetition,
      nextReviewDate,
      lastReviewDate: now,
      previousInterval,
    });
  }

  return updates;
}

export function buildQuestionPerformances(
  questions: MockExamQuestion[],
  answers: Record<string, string>,
): QuestionPerformance[] {
  return questions.map((q) => {
    const isCorrect = answers[q.id] === q.correctOption;
    return {
      questionId: q.id,
      correctCount: isCorrect ? 1 : 0,
      incorrectCount: isCorrect ? 0 : 1,
      confidence: null,
      lastAnsweredAt: new Date(),
    };
  });
}

// ─── Supabase Persistence ─────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export async function saveTopicSRState(userId: string, updates: TopicSRStateUpdate[]): Promise<void> {
  try {
    const rows = updates.map((u) => ({
      user_id: userId,
      topic: u.topic,
      easiness_factor: u.easinessFactor,
      interval_days: u.intervalDays,
      repetitions: u.repetitions,
      next_review_date: u.nextReviewDate.toISOString().split('T')[0],
      last_review_date: u.lastReviewDate.toISOString().split('T')[0],
    }));
    const { error } = await supabase.from('topic_sr_state').upsert(rows, { onConflict: 'user_id,topic' });
    if (error) {
      console.error('Failed to save topic SR state:', error);
    }
  } catch (err) {
    console.error('Failed to save topic SR state:', err);
  }
}

export async function saveQuestionPerformances(userId: string, performances: QuestionPerformance[]): Promise<void> {
  try {
    const rows = performances.map((p) => ({
      user_id: userId,
      question_id: p.questionId,
      correct_count: p.correctCount,
      incorrect_count: p.incorrectCount,
      last_answered_at: p.lastAnsweredAt.toISOString(),
    }));
    const { error } = await supabase.from('question_performance').upsert(rows, { onConflict: 'user_id,question_id' });
    if (error) {
      console.error('Failed to save question performances:', error);
    }
  } catch (err) {
    console.error('Failed to save question performances:', err);
  }
}

export async function loadTopicSRStates(userId: string): Promise<Map<string, TopicSRState>> {
  try {
    const { data, error } = await supabase
      .from('topic_sr_state')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Failed to load topic SR states:', error);
      return new Map();
    }
    const map = new Map<string, TopicSRState>();
    for (const row of data ?? []) {
      map.set(row.topic, {
        topic: row.topic,
        easinessFactor: row.easiness_factor,
        intervalDays: row.interval_days,
        repetitions: row.repetitions,
        nextReviewDate: new Date(row.next_review_date),
        lastReviewDate: new Date(row.last_review_date),
      });
    }
    return map;
  } catch (err) {
    console.error('Failed to load topic SR states:', err);
    return new Map();
  }
}


