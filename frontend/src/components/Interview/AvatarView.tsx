import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { endpoints, axiosConfig } from '../../config/api';

interface AvatarViewProps {
  questionId: string;
  onVideoEnd?: () => void;
  questionText?: string;
}

interface AvatarStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  video_url: string | null;
  error?: string;
}

interface InvokeAvatarResponse {
  success: boolean;
  message: string;
}

export const AvatarView: React.FC<AvatarViewProps> = ({ questionId, onVideoEnd, questionText }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get avatar status
  const { data: status, refetch, isError: isStatusError } = useQuery<AvatarStatus>({
    queryKey: ['avatarStatus', questionId],
    queryFn: async () => {
      console.log('Fetching avatar status for question:', questionId);
      const response = await axios.get(
        endpoints.interviews.getAvatarStatus(questionId),
        axiosConfig
      );
      console.log('Avatar status response:', response.data);
      return response.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as AvatarStatus | undefined;
      return data?.status === 'processing' ? 2000 : false;
    },
    retry: 3,
  });

  // Invoke avatar
  const { mutate: invokeAvatar, isPending: isInvoking } = useMutation<InvokeAvatarResponse>({
    mutationFn: async () => {
      console.log('Invoking avatar for question:', questionId);
      const response = await axios.post(
        endpoints.interviews.invokeAvatar(questionId),
        { text: questionText },
        axiosConfig
      );
      console.log('Invoke response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Successfully invoked avatar, refetching status...');
      setVideoError(null);
      refetch();
    },
    onError: (error) => {
      console.error('Error invoking avatar:', error);
      setVideoError('Failed to generate avatar response. Please try again.');
    },
  });

  // Handle video loading
  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setIsLoading(false);
    setVideoError(null);
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error('Error playing video:', error);
        setVideoError('Failed to play video. Please try again.');
      });
    }
  };

  // Handle video error
  const handleVideoError = (error: any) => {
    console.error('Video error:', error);
    setIsLoading(false);
    setVideoError('Failed to load video. Please try again.');
  };

  // Update video source
  useEffect(() => {
    if (status?.video_url && videoRef.current) {
      console.log('Setting video source:', status.video_url);
      setIsLoading(true);
      videoRef.current.src = status.video_url;
      videoRef.current.load();
    }
  }, [status?.video_url]);

  // Error UI
  if (isStatusError || status?.status === 'error' || videoError) {
    return (
      <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-xl mb-4">
            {videoError || status?.error || 'Failed to load avatar. Please try again.'}
          </div>
          <button
            onClick={() => {
              setVideoError(null);
              invokeAvatar();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Video Container */}
      <div className="absolute inset-0">
        {status?.video_url ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              onEnded={() => {
                setIsPlaying(false);
                onVideoEnd?.();
              }}
              playsInline
              controls={false}
              loop={false}
            >
              <source src={status.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900" />
        )}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Question Text */}
        {questionText && (
          <div className="absolute top-8 left-8 right-8">
            <div className="text-4xl text-white font-medium text-center">
              {questionText}
            </div>
          </div>
        )}

        {/* Invoke Button - Only show if not playing */}
        {!isPlaying && (
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 -m-32 rounded-[6rem] bg-purple-500/20 animate-[ping_3.5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 -m-28 rounded-[6rem] bg-blue-500/20 animate-[ping_3s_ease-in-out_infinite]" />
            <div className="absolute inset-0 -m-24 rounded-[6rem] bg-indigo-500/30 animate-[ping_2.5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 -m-20 rounded-[6rem] bg-blue-500/40 animate-[ping_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 -m-16 rounded-[6rem] bg-purple-500/50 animate-[ping_1.5s_ease-in-out_infinite]" />
            
            <button
              onClick={() => {
                console.log('Invoke button clicked');
                setIsPlaying(true);
                invokeAvatar();
              }}
              disabled={isInvoking || status?.status === 'processing' || isLoading}
              className={`
                relative px-56 py-32 rounded-[6rem]
                bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                flex flex-col items-center gap-12 transition-all transform
                shadow-[0_0_200px_rgba(59,130,246,0.8)]
                hover:shadow-[0_0_300px_rgba(59,130,246,1)]
                hover:scale-105
                ${(isInvoking || status?.status === 'processing' || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'}
              `}
            >
              {isInvoking || status?.status === 'processing' || isLoading ? (
                <>
                  <div className="w-40 h-40 border-8 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-9xl font-semibold text-white">
                    {isLoading ? 'Loading...' : 'Reading...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-56 h-56 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <div className="flex flex-col items-center gap-8">
                    <span className="text-[10rem] font-bold text-white">Click to Start</span>
                    <span className="text-7xl text-blue-100">Hear the interview question</span>
                  </div>
                </>
              )}
            </button>
          </div>
        )}

        {/* Playback Controls */}
        {status?.video_url && !isLoading && (
          <div className="absolute bottom-8 right-8">
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (!isPlaying) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(error => {
                      console.error('Error playing video:', error);
                      setVideoError('Failed to play video. Please try again.');
                    });
                    setIsPlaying(true);
                  } else {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                }
              }}
              className={`
                p-4 rounded-full transition-all transform hover:scale-105
                shadow-lg hover:shadow-xl
                ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              `}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarView;