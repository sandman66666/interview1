import { useState, useCallback, useRef, useEffect } from "react";

interface UseRecordingOptions {
  maxDuration?: number;
  onRecordingComplete?: (blob: Blob) => void;
}

export function useRecording({ maxDuration = 300, onRecordingComplete }: UseRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        const defaultDevice = videoDevices.find(d => d.label.toLowerCase().includes('built-in')) || videoDevices[0];
        setSelectedDeviceId(defaultDevice.deviceId);
        return defaultDevice.deviceId;
      }
      return selectedDeviceId;
    } catch (err) {
      console.error('Error getting devices:', err);
      setError('Failed to get camera devices. Please ensure camera permissions are granted.');
      return null;
    }
  }, [selectedDeviceId]);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const initializeCamera = useCallback(async (deviceId?: string) => {
    if (isInitializing) return null;
    
    try {
      setIsInitializing(true);
      setError(null);

      // Stop any existing stream
      stopCurrentStream();

      // Get available devices and select one if needed
      const effectiveDeviceId = deviceId || await getDevices();
      if (!effectiveDeviceId) {
        throw new Error('No camera device available');
      }

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: {
          deviceId: effectiveDeviceId ? { exact: effectiveDeviceId } : undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera. Please ensure you have granted camera permissions and try again.');
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [getDevices, stopCurrentStream, isInitializing]);

  const changeCamera = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await initializeCamera(deviceId);
  }, [initializeCamera]);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const newStream = await initializeCamera(selectedDeviceId);
        if (!newStream) return;
      }

      // Ensure we're using the current stream
      const currentStream = streamRef.current;
      if (!currentStream) {
        throw new Error('No media stream available');
      }

      recordedChunks.current = [];
      const options = { 
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };
      
      if (mediaRecorder.current) {
        mediaRecorder.current.ondataavailable = null;
        mediaRecorder.current.onstop = null;
      }

      mediaRecorder.current = new MediaRecorder(currentStream, options);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, {
          type: 'video/webm'
        });
        setRecordedBlob(blob);
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      mediaRecorder.current.start(1000); // Capture data every second
      setIsRecording(true);
      setError(null);

      // Set timeout for max duration
      if (maxDuration) {
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }
        timeoutId.current = setTimeout(() => {
          if (mediaRecorder.current?.state === 'recording') {
            stopRecording();
          }
        }, maxDuration * 1000);
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please try again.');
    }
  }, [initializeCamera, maxDuration, onRecordingComplete, selectedDeviceId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    recordedChunks.current = [];
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    getDevices().then(deviceId => {
      if (deviceId) {
        initializeCamera(deviceId);
      }
    });

    // Cleanup function
    return () => {
      if (mediaRecorder.current?.state === 'recording') {
        mediaRecorder.current.stop();
      }
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      stopCurrentStream();
    };
  }, [getDevices, initializeCamera, stopCurrentStream]);

  return {
    isRecording,
    recordedBlob,
    error,
    stream: streamRef.current,
    devices,
    selectedDeviceId,
    isInitializing,
    startRecording,
    stopRecording,
    resetRecording,
    initializeCamera,
    changeCamera
  };
}