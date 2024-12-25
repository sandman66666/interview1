import { useEffect, useRef } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

interface ReviewPanelProps {
  recording: Blob;
  onReRecord: () => void;
  onAccept: () => void;
}

export function ReviewPanel({ recording, onReRecord, onAccept }: ReviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && recording) {
      const videoURL = URL.createObjectURL(recording);
      videoRef.current.src = videoURL;

      return () => {
        URL.revokeObjectURL(videoURL);
      };
    }
  }, [recording]);

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-900">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          controls
          playsInline
        />
      </div>
      <div className="flex justify-center gap-4 p-4">
        <Button onClick={onReRecord} variant="outline">
          Re-record
        </Button>
        <Button onClick={onAccept} variant="default">
          Accept and Continue
        </Button>
      </div>
    </Card>
  );
}