import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL, axiosConfig } from "~/config";
import { Button } from "~/components/ui/button";
import { useRecording } from "~/hooks/useRecording";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  order_number: number;
  avatar_video_url: string | null;
  avatar_video_status: string;
  avatar_video_id: string | null;
  voice_id: string;
  voice_style: string | null;
  avatar_video_error: string | null;
}

interface Response {
  id: string;
  question_id: string;
  video_url: string;
  transcription: string | null;
  created_at: string;
  updated_at: string;
}

interface Interview {
  id: string;
  url_id: string;
  status: string;
  questions: Question[];
  responses: Response[];
  created_at: string;
  updated_at: string;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { token } = params;
  
  if (!token) {
    throw json({ error: "Interview token is required" }, { status: 400 });
  }

  try {
    console.log("Fetching interview with token:", token);
    const response = await axios.get<Interview>(
      `${API_BASE_URL}/interviews/by-token/${token}`,
      axiosConfig
    );

    if (!response.data) {
      throw json({ error: "Interview not found" }, { status: 404 });
    }

    return json(response.data);
  } catch (error) {
    console.error("Error loading interview:", error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw json({ error: "Interview not found or token invalid" }, { status: 404 });
      }
      if (error.response?.status === 401) {
        throw json({ error: "Invalid or expired token" }, { status: 401 });
      }
    }
    throw json(
      { error: "Failed to load interview. Please try again." },
      { status: 500 }
    );
  }
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">
          {isRouteErrorResponse(error)
            ? error.data?.error || "Error loading interview"
            : "An unexpected error occurred"}
        </h1>
        <p className="text-slate-400 mb-8">
          {isRouteErrorResponse(error) && error.status === 404
            ? "The interview you're looking for doesn't exist or has expired."
            : isRouteErrorResponse(error) && error.status === 401
            ? "Your interview link has expired. Please request a new one."
            : "There was a problem loading the interview. Please try again."}
        </p>
        <Button
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const interview = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const currentQuestion = interview.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === interview.questions.length - 1;

  const {
    isRecording,
    recordedBlob,
    error: recordingError,
    stream,
    devices,
    selectedDeviceId,
    startRecording,
    stopRecording,
    resetRecording,
    initializeCamera,
    changeCamera
  } = useRecording({
    maxDuration: 300, // 5 minutes max
    onRecordingComplete: (blob) => {
      console.log("Recording complete, blob size:", blob.size);
    }
  });

  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleUploadRecording = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'response.webm');
      formData.append('interview_id', interview.id);
      formData.append('question_id', currentQuestion.id);

      await axios.post(
        `${API_BASE_URL}/recordings/upload`,
        formData,
        {
          ...axiosConfig,
          headers: {
            ...axiosConfig.headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success("Response saved successfully!");
      
      if (!isLastQuestion) {
        setCurrentQuestionIndex(prev => prev + 1);
        resetRecording();
      } else {
        // Handle interview completion
        toast.success("Interview completed! Thank you for your responses.");
        navigate("/completion");
      }
    } catch (error) {
      console.error("Error uploading response:", error);
      toast.error("Failed to save response. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getResponseForQuestion = (questionId: string) => {
    return interview.responses.find(r => r.question_id === questionId);
  };

  if (navigation.state === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-200 mx-auto mb-4"></div>
          <p className="text-lg">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Interview Session</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowRecordings(!showRecordings)}
              variant="outline"
              className="text-slate-400 hover:text-slate-200"
            >
              {showRecordings ? "Hide Recordings" : "Show Recordings"}
            </Button>
            <span className="text-slate-400">
              Question {currentQuestionIndex + 1} of {interview.questions.length}
            </span>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className={`grid ${showRecordings ? 'grid-cols-3' : 'grid-cols-2'} gap-4 h-[calc(100vh-8rem)]`}>
          {/* Left side - Avatar */}
          <div className="bg-slate-900 rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              {currentQuestion.avatar_video_url ? (
                <div className="relative h-full">
                  <video
                    key={currentQuestion.avatar_video_url}
                    src={currentQuestion.avatar_video_url}
                    controls
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay
                  >
                    <track kind="captions" />
                  </video>
                  {currentQuestion.avatar_video_status === 'completed' && currentQuestion.avatar_video_id?.startsWith('fallback') && (
                    <div className="absolute top-2 right-2 bg-yellow-600 text-white px-2 py-1 rounded text-sm">
                      Using Fallback Video
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-200 mx-auto mb-2"></div>
                    <p className="text-slate-400">Loading avatar...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-800">
              <p className="text-lg font-medium">{currentQuestion.text}</p>
            </div>
          </div>

          {/* Middle - User video */}
          <div className="bg-slate-900 rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              {recordedBlob ? (
                <video
                  src={URL.createObjectURL(recordedBlob)}
                  controls
                  className="w-full h-full object-cover"
                  playsInline
                >
                  <track kind="captions" />
                </video>
              ) : (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              
              {recordingError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center p-4">
                    <p className="text-red-400 mb-2">{recordingError}</p>
                    <Button
                      onClick={() => initializeCamera(selectedDeviceId)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Retry Camera Access
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-800">
              {/* Camera selection */}
              <div className="mb-4">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => changeCamera(e.target.value)}
                  className="w-full p-2 bg-slate-700 rounded-lg text-slate-200 mb-2"
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-center">
                {!isRecording && !recordedBlob && (
                  <Button
                    onClick={startRecording}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!!recordingError}
                  >
                    Start Recording
                  </Button>
                )}
                
                {isRecording && (
                  <Button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Stop Recording
                  </Button>
                )}
                
                {recordedBlob && (
                  <>
                    <Button
                      onClick={resetRecording}
                      variant="outline"
                      className="border-slate-600 text-slate-200 hover:bg-slate-700"
                      disabled={isUploading}
                    >
                      Re-record
                    </Button>
                    <Button
                      onClick={handleUploadRecording}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : isLastQuestion ? (
                        "Complete Interview"
                      ) : (
                        "Next Question"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Recordings history */}
          {showRecordings && (
            <div className="bg-slate-900 rounded-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold">Previous Recordings</h2>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  {interview.questions.map((question, index) => {
                    const response = getResponseForQuestion(question.id);
                    return (
                      <div key={question.id} className="bg-slate-800 rounded-lg p-4">
                        <p className="font-medium mb-2">
                          Question {index + 1}: {question.text}
                        </p>
                        {response ? (
                          <video
                            src={response.video_url}
                            controls
                            className="w-full rounded-lg"
                            playsInline
                          >
                            <track kind="captions" />
                          </video>
                        ) : (
                          <p className="text-slate-400 text-sm">No recording yet</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}