import { useEffect, useRef, useState } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useRecording } from "~/hooks/useRecording";
import { Loader2 } from "lucide-react";

interface RecordingBoxProps {
  onRecordingComplete: (blob: Blob) => void;
  onReview: () => void;
}

export function RecordingBox({ onRecordingComplete, onReview }: RecordingBoxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    isRecording, 
    stream, 
    recordedBlob,
    error,
    isInitializing,
    startRecording, 
    stopRecording, 
    initializeCamera
  } = useRecording();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

  // Handle stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      // Reset video loaded state when stream changes
      setIsVideoLoaded(false);
    }
  }, [stream]);

  // Handle recording completion
  useEffect(() => {
    if (recordedBlob && !isRecording) {
      onRecordingComplete(recordedBlob);
    }
  }, [recordedBlob, isRecording, onRecordingComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleCanPlay = () => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="aspect-video bg-gray-900 relative">
          {/* Loading overlay */}
          {(isInitializing || !isVideoLoaded) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-white text-sm">
                {isInitializing ? "Initializing camera..." : "Loading video..."}
              </p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
              <p className="text-red-500 text-center p-4">{error}</p>
              <Button 
                onClick={() => initializeCamera()} 
                variant="destructive"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Video element */}
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
            onCanPlay={handleCanPlay}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 p-4">
          {!isRecording ? (
            <Button 
              onClick={() => startRecording()} 
              variant="default"
              disabled={isInitializing || !isVideoLoaded || !!error}
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Initializing...
                </>
              ) : (
                'Start Recording'
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => stopRecording()} 
              variant="destructive"
            >
              Stop Recording
            </Button>
          )}
          
          {recordedBlob && !isRecording && (
            <Button 
              onClick={onReview} 
              variant="outline"
            >
              Review Recording
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}