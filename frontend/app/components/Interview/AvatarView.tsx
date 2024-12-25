import { useEffect, useRef, useState } from "react";
import { Card } from "~/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { config } from "~/config";

interface AvatarViewProps {
  question: string;
  questionId: string;
  avatarStatus?: string;
  avatarUrl?: string | null;
  avatarError?: string | null;
}

interface AvatarResponse {
  video_url: string;
  id: string;
  is_fallback?: boolean;
}

export function AvatarView({ 
  question, 
  questionId, 
  avatarStatus = 'pending',
  avatarUrl = null,
  avatarError = null 
}: AvatarViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = config.avatar.retryAttempts;

  const getFallbackVideo = () => {
    // Get a deterministic fallback video based on the question ID
    const fallbackKeys = Object.keys(config.avatar.fallbackVideos);
    const index = Math.abs(
      questionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % (fallbackKeys.length - 1); // -1 to exclude 'default'
    const key = fallbackKeys[index] as keyof typeof config.avatar.fallbackVideos;
    return config.avatar.fallbackVideos[key] || config.avatar.fallbackVideos.default;
  };

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If we already have a URL from props, use it
      if (avatarUrl) {
        if (videoRef.current) {
          videoRef.current.src = avatarUrl;
          await videoRef.current.load();
          videoRef.current.oncanplay = () => {
            setIsLoading(false);
            videoRef.current?.play().catch(console.error);
          };
          videoRef.current.onerror = () => {
            console.error("Video loading failed, using fallback");
            useFallbackVideo();
          };
        }
        return;
      }

      // If we have an error from props, use fallback
      if (avatarError) {
        console.log("Avatar error from props:", avatarError);
        useFallbackVideo();
        return;
      }

      // If status is error, use fallback
      if (avatarStatus === 'error') {
        console.log("Avatar status is error, using fallback");
        useFallbackVideo();
        return;
      }

      // Otherwise, try to fetch the video
      const response = await fetch(
        `${config.apiBaseUrl}${config.endpoints.recordings}/question/${questionId}/avatar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(response.statusText || "Failed to load avatar video");
      }

      const data: AvatarResponse = await response.json();
      
      if (videoRef.current) {
        videoRef.current.src = data.video_url;
        await videoRef.current.load();
        
        videoRef.current.oncanplay = () => {
          setIsLoading(false);
          videoRef.current?.play().catch(console.error);
        };
        
        videoRef.current.onerror = () => {
          console.error("Video loading failed, using fallback");
          useFallbackVideo();
        };
      }

    } catch (err) {
      console.error("Error loading avatar:", err);
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadVideo();
        }, Math.pow(2, retryCount) * config.avatar.retryDelay);
      } else {
        console.log("Max retries reached, using fallback video");
        useFallbackVideo();
      }
    }
  };

  const useFallbackVideo = () => {
    if (videoRef.current) {
      const fallbackUrl = getFallbackVideo();
      videoRef.current.src = fallbackUrl;
      videoRef.current.load();
      
      videoRef.current.oncanplay = () => {
        setIsLoading(false);
        setError(null);
        videoRef.current?.play().catch(console.error);
      };
      
      videoRef.current.onerror = () => {
        setError("Failed to load video");
        setIsLoading(false);
      };
    }
  };

  useEffect(() => {
    if (questionId) {
      setRetryCount(0);
      loadVideo();
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.oncanplay = null;
        videoRef.current.onerror = null;
      }
    };
  }, [questionId, avatarUrl, avatarStatus, avatarError]);

  const handleRetry = () => {
    setRetryCount(0);
    loadVideo();
  };

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-900 relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
            <p className="text-white text-sm">
              {retryCount > 0 ? `Retrying (${retryCount}/${maxRetries})...` : "Loading avatar..."}
            </p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-white text-center mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          autoPlay
          muted
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold">Current Question</h3>
        <p className="mt-2 text-gray-700">{question}</p>
      </div>
    </Card>
  );
}