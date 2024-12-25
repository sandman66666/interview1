import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@remix-run/react';
import { AvatarView } from './AvatarView';
import { RecordingBox } from './RecordingBox';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import axios from 'axios';
import { endpoints, axiosConfig } from '../../config/api';

interface Question {
  id: string;
  text: string;
  order_number: number;
  avatar_video_status?: string;
  avatar_video_url?: string;
}

interface Interview {
  id: string;
  url_id: string;
  status: string;
  questions: Question[];
  responses: any[];
}

interface InterviewContainerProps {
  interview: Interview;
}

export const InterviewContainer: React.FC<InterviewContainerProps> = ({ interview }) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAvatarPlaying, setIsAvatarPlaying] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Upload recording mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { questionId: string; recording: Blob }) => {
      const formData = new FormData();
      formData.append('recording', data.recording);
      return axios.post(
        endpoints.interviews.uploadRecording(data.questionId),
        formData,
        axiosConfig
      );
    },
  });

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (!interview?.questions[currentQuestionIndex]) return;

    try {
      await uploadMutation.mutateAsync({
        questionId: interview.questions[currentQuestionIndex].id,
        recording: blob,
      });
      setIsReviewing(true);
    } catch (error) {
      console.error('Failed to upload recording:', error);
    }
  }, [currentQuestionIndex, interview, uploadMutation]);

  const handleNextQuestion = useCallback(() => {
    if (!interview?.questions) return;

    if (currentQuestionIndex < interview.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsReviewing(false);
      setIsAvatarPlaying(true);
    } else {
      // Interview completed
      navigate(`/interview/${interview.url_id}/complete`);
    }
  }, [currentQuestionIndex, interview, navigate]);

  const handleRetryRecording = useCallback(() => {
    setIsReviewing(false);
  }, []);

  const handleRecordingError = useCallback((error: string) => {
    console.error('Recording error:', error);
  }, []);

  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400">Interview not found</div>
      </div>
    );
  }

  const currentQuestion = interview.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / interview.questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <div className="container mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <div className="mt-2 text-sm text-slate-400">
            Question {currentQuestionIndex + 1} of {interview.questions.length}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Avatar Section - Made taller */}
          <div className="h-[700px] bg-slate-900 rounded-lg overflow-hidden">
            <AvatarView
              questionId={currentQuestion.id}
              questionText={currentQuestion.text}
              onVideoEnd={() => setIsAvatarPlaying(false)}
            />
          </div>

          {/* Recording Section */}
          <div className="h-[700px] bg-slate-900 rounded-lg overflow-hidden">
            <RecordingBox
              questionId={currentQuestion.id}
              onRecordingComplete={handleRecordingComplete}
              onError={handleRecordingError}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="text-2xl font-medium text-slate-200">
            {currentQuestion.text}
          </div>
          
          <div className="flex gap-4">
            {isReviewing && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRetryRecording}
                  className="px-8"
                >
                  Record Again
                </Button>
                <Button
                  size="lg"
                  onClick={handleNextQuestion}
                  className="px-8 bg-blue-600 hover:bg-blue-700"
                >
                  {currentQuestionIndex < interview.questions.length - 1 ? 'Next Question' : 'Complete Interview'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewContainer;