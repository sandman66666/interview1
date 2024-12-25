import { useState, useCallback, useEffect } from "react";

interface Question {
  id: string;
  text: string;
}

interface QuestionStatus {
  id: string;
  completed: boolean;
  hasRecording: boolean;
}

interface InterviewState {
  currentQuestionIndex: number;
  questionStatuses: QuestionStatus[];
  lastUpdated: number;
}

interface UseInterviewProps {
  questions: Question[];
  interviewId: string;
  onProgressUpdate?: (progress: number) => void;
}

const STORAGE_KEY_PREFIX = 'interview_progress_';

const isBrowser = typeof window !== 'undefined';

export function useInterview({ questions, interviewId, onProgressUpdate }: UseInterviewProps) {
  // Load initial state from storage or create new
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    if (!isBrowser) return 0;
    const saved = loadInterviewState(interviewId);
    return saved ? saved.currentQuestionIndex : 0;
  });

  const [questionStatuses, setQuestionStatuses] = useState<QuestionStatus[]>(() => {
    if (!isBrowser) {
      return questions.map((q) => ({
        id: q.id,
        completed: false,
        hasRecording: false,
      }));
    }
    const saved = loadInterviewState(interviewId);
    return saved ? saved.questionStatuses : questions.map((q) => ({
      id: q.id,
      completed: false,
      hasRecording: false,
    }));
  });

  // Load interview state from localStorage
  function loadInterviewState(id: string): InterviewState | null {
    if (!isBrowser) return null;
    
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      if (!saved) return null;
      
      const state = JSON.parse(saved) as InterviewState;
      // Validate stored data matches current questions
      if (state.questionStatuses.length !== questions.length) return null;
      
      return state;
    } catch (error) {
      console.error('Error loading interview state:', error);
      return null;
    }
  }

  // Save current state to localStorage
  const saveInterviewState = useCallback(() => {
    if (!isBrowser) return;

    try {
      const state: InterviewState = {
        currentQuestionIndex,
        questionStatuses,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${interviewId}`, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving interview state:', error);
    }
  }, [currentQuestionIndex, questionStatuses, interviewId]);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const completedCount = questionStatuses.filter((s) => s.completed).length;
    return (completedCount / questions.length) * 100;
  }, [questionStatuses, questions.length]);

  // Update progress when question statuses change
  useEffect(() => {
    if (!isBrowser) return;

    const progress = calculateProgress();
    onProgressUpdate?.(progress);
    saveInterviewState(); // Save state whenever it changes
  }, [questionStatuses, calculateProgress, onProgressUpdate, saveInterviewState]);

  // Mark current question as completed
  const markCurrentQuestionCompleted = useCallback((hasRecording: boolean = true) => {
    setQuestionStatuses((prev) =>
      prev.map((status, idx) =>
        idx === currentQuestionIndex
          ? { ...status, completed: true, hasRecording }
          : status
      )
    );
  }, [currentQuestionIndex]);

  // Navigate to next question
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentQuestionIndex, questions.length]);

  // Navigate to previous question
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      return true;
    }
    return false;
  }, [currentQuestionIndex]);

  // Jump to specific question
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      return true;
    }
    return false;
  }, [questions.length]);

  // Get current question
  const getCurrentQuestion = useCallback(() => {
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex]);

  // Get question status
  const getQuestionStatus = useCallback((questionId: string) => {
    return questionStatuses.find((status) => status.id === questionId);
  }, [questionStatuses]);

  // Clear interview progress
  const clearProgress = useCallback(() => {
    if (!isBrowser) return;

    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${interviewId}`);
      setCurrentQuestionIndex(0);
      setQuestionStatuses(questions.map((q) => ({
        id: q.id,
        completed: false,
        hasRecording: false,
      })));
    } catch (error) {
      console.error('Error clearing interview progress:', error);
    }
  }, [interviewId, questions]);

  return {
    currentQuestionIndex,
    currentQuestion: getCurrentQuestion(),
    totalQuestions: questions.length,
    progress: calculateProgress(),
    questionStatuses,
    isFirstQuestion: currentQuestionIndex === 0,
    isLastQuestion: currentQuestionIndex === questions.length - 1,
    markCurrentQuestionCompleted,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    getQuestionStatus,
    clearProgress,
  };
}