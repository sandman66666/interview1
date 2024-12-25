import * as React from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { RecordingState } from "~/hooks/useRecording";
import { LogDisplay } from "./LogDisplay";

interface RecordingSectionProps {
  recordingState: RecordingState;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onResetRecording: () => void;
  onAcceptRecording: () => void;
}

export function RecordingSection({
  recordingState,
  onStartRecording,
  onStopRecording,
  onResetRecording,
  onAcceptRecording,
}: RecordingSectionProps) {
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoPreviewRef.current && recordingState.stream) {
      videoPreviewRef.current.srcObject = recordingState.stream;
    }
  }, [recordingState.stream]);

  return (
    <Card className="h-full">
      <div className="p-6 flex flex-col h-full">
        {/* Video Preview Area */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4">
          {recordingState.stream && !recordingState.previewUrl && (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {recordingState.previewUrl && (
            <video
              src={recordingState.previewUrl}
              controls
              className="w-full h-full object-cover"
            />
          )}

          {!recordingState.stream && !recordingState.previewUrl && (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <p className="text-muted-foreground">
                Click "Start Recording" to begin
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {recordingState.error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {recordingState.error}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center gap-4 mb-4">
          {!recordingState.isRecording && !recordingState.previewUrl && (
            <Button
              className="flex-1"
              onClick={onStartRecording}
              disabled={!!recordingState.error}
            >
              Start Recording
            </Button>
          )}

          {recordingState.isRecording && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onStopRecording}
            >
              Stop Recording
            </Button>
          )}

          {recordingState.previewUrl && (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onResetRecording}
              >
                Record Again
              </Button>
              <Button
                className="flex-1"
                onClick={onAcceptRecording}
              >
                Accept Recording
              </Button>
            </>
          )}
        </div>

        {/* Logs Display */}
        <LogDisplay logs={recordingState.logs} />
      </div>
    </Card>
  );
}