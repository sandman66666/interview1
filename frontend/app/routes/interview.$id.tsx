import * as React from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { InterviewLayout } from "~/components/Interview/InterviewLayout";
import { AvatarSection } from "~/components/Interview/AvatarSection";
import { RecordingSection } from "~/components/Interview/RecordingSection";
import { useRecording } from "~/hooks/useRecording";
import { config } from "~/config";

interface Question {
  id: string;
  text: string;
  order_number: number;
  avatar_video_url: string | null;
  avatar_video_status: "pending" | "processing" | "completed" | "error";
  avatar_video_id: string | null;
  voice_id: string;
  voice_style: string | null;
  avatar_video_error: string | null;
}

interface QuestionState extends Question {
  isPolling: boolean;
  pollAttempts: number;
}

interface Interview {
  id: string;
  questions: Question[];
  responses: any[];
}

interface LoaderData {
  interview: Interview;
}

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw json("Interview token is required", { status: 400 });
  }

  try {
    console.log("Fetching interview with token:", params.id);

    // Use the correct API endpoint path
    const response = await fetch(`${config.apiBaseUrl}/interviews/by-token/${encodeURIComponent(params.id)}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("Failed to load interview:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      throw json(
        `Failed to load interview: ${response.statusText}`,
        { status: response.status }
      );
    }

    const interview = await response.json();
    console.log("Interview loaded:", interview);

    return json({ interview });
  } catch (error) {
    console.error("Error loading interview:", error);
    if (error instanceof Response) {
      throw error;
    }
    throw json(
      "Failed to load interview. Please try again later.",
      { status: 500 }
    );
  }
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let message = "An unexpected error occurred";
  let title = "Error";

  if (isRouteErrorResponse(error)) {
    message = error.data;
    title = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    </div>
  );
}

export default function Interview() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const questions = data.interview.questions || [];
  const [questionStates, setQuestionStates] = React.useState<QuestionState[]>(
    questions.map((q: Question) => ({
      ...q,
      isPolling: q.avatar_video_status === "processing",
      pollAttempts: 0
    }))
  );

  const {
    recordingState,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecording();

  // Poll for video status updates
  React.useEffect(() => {
    const pollInterval = config.avatar.pollInterval || 1000; // Poll every second
    const maxAttempts = config.avatar.maxPollAttempts || 30; // Maximum polling attempts
    const pollingQuestions = questionStates.filter((q: QuestionState) => 
      q.isPolling && q.pollAttempts < maxAttempts && q.avatar_video_id
    );

    if (pollingQuestions.length === 0) return;

    const intervals = pollingQuestions.map((question: QuestionState) => {
      const intervalId = setInterval(async () => {
        try {
          console.log(`Polling status for question ${question.id}, attempt ${question.pollAttempts + 1}`);
          const response = await fetch(
            `${config.apiBaseUrl}/interviews/questions/${question.id}/avatar-status`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch status: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`Status response for question ${question.id}:`, data);

          setQuestionStates(prev =>
            prev.map(q =>
              q.id === question.id
                ? {
                    ...q,
                    avatar_video_url: data.video_url || q.avatar_video_url,
                    avatar_video_status: data.status || q.avatar_video_status,
                    avatar_video_error: data.error || q.avatar_video_error,
                    isPolling: data.status === "processing" && q.pollAttempts < maxAttempts,
                    pollAttempts: q.pollAttempts + 1
                  }
                : q
            )
          );

          if (data.status !== "processing" || question.pollAttempts >= maxAttempts) {
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error(`Error polling video status for question ${question.id}:`, error);
          setQuestionStates(prev =>
            prev.map(q =>
              q.id === question.id
                ? {
                    ...q,
                    avatar_video_status: "error",
                    avatar_video_error: "Failed to load video. Please try refreshing the page.",
                    isPolling: false
                  }
                : q
            )
          );
          clearInterval(intervalId);
        }
      }, pollInterval);

      return intervalId;
    });

    return () => intervals.forEach(clearInterval);
  }, [questionStates]);

  const handleStartRecording = React.useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error("Recording error:", error);
      throw new Error("Failed to start recording. Please check your camera and microphone permissions.");
    }
  }, [startRecording]);

  const handleStopRecording = React.useCallback(async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error("Recording error:", error);
      throw new Error("Failed to stop recording. Please try again.");
    }
  }, [stopRecording]);

  const handleNextQuestion = React.useCallback(() => {
    resetRecording();
    setCurrentQuestion((prev) => Math.min(prev + 1, questions.length - 1));
  }, [resetRecording, questions.length]);

  const handlePreviousQuestion = React.useCallback(() => {
    resetRecording();
    setCurrentQuestion((prev) => Math.max(prev - 1, 0));
  }, [resetRecording]);

  const handleFinishInterview = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Ensure we have valid questions before rendering
  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Questions Found</h1>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const currentQuestionData = questionStates[currentQuestion];

  const header = (
    <>
      <h1 className="text-3xl font-bold">Video Interview</h1>
      <Progress value={(currentQuestion / questions.length) * 100} />
      <p className="text-muted-foreground">
        Question {currentQuestion + 1} of {questions.length}
      </p>
    </>
  );

  const footer = (
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={handlePreviousQuestion}
        disabled={currentQuestion === 0}
      >
        Previous Question
      </Button>
      {currentQuestion === questions.length - 1 ? (
        <Button onClick={handleFinishInterview}>
          Finish Interview
        </Button>
      ) : (
        <Button onClick={handleNextQuestion}>Next Question</Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold hover:text-primary transition-colors">
            Interview Platform
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <InterviewLayout
          header={header}
          footer={footer}
          avatarSection={
            <AvatarSection
              key={currentQuestionData.id}
              questionId={currentQuestionData.id}
              question={currentQuestionData.text}
              isLoading={currentQuestionData.avatar_video_status === "processing"}
              videoUrl={currentQuestionData.avatar_video_url}
            />
          }
          recordingSection={
            <RecordingSection
              key={currentQuestionData.id}
              recordingState={recordingState}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onResetRecording={resetRecording}
              onAcceptRecording={handleNextQuestion}
            />
          }
        />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Interview Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}