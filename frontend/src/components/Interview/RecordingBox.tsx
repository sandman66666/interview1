import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';

interface RecordingBoxProps {
  questionId: string;
  onRecordingComplete: (blob: Blob) => void;
  onError: (error: string) => void;
}

export const RecordingBox: React.FC<RecordingBoxProps> = ({
  questionId,
  onRecordingComplete,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check camera permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setHasPermission(result.state === 'granted');
        
        // If permission is granted, initialize the preview
        if (result.state === 'granted') {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            },
            audio: true,
          });
          
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        onError('Unable to access camera. Please check your camera permissions.');
      }
    };

    checkPermissions();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  const startRecording = useCallback(async () => {
    try {
      if (!stream) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true,
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }

      const currentStream = stream || videoRef.current?.srcObject as MediaStream;
      if (!currentStream) {
        throw new Error('No media stream available');
      }

      const mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Failed to start recording. Please ensure your camera and microphone are working.');
    }
  }, [onRecordingComplete, onError, stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isRecording, stream]);

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-800 text-white p-4">
        <p>Camera access is required for this interview.</p>
        <p>Please enable camera access in your browser settings and refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-slate-800"
      />
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="default"
            className="bg-red-500 hover:bg-red-600"
            disabled={!hasPermission}
          >
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="default"
            className="bg-slate-500 hover:bg-slate-600"
          >
            Stop Recording
          </Button>
        )}
      </div>
    </div>
  );
};

export default RecordingBox;