import * as React from "react";
import { Card } from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { config } from "~/config";

interface AvatarSectionProps {
  question: string;
  questionId: string;
  isLoading?: boolean;
  videoUrl?: string | null;
}

export function AvatarSection({ question, questionId, isLoading = false, videoUrl: initialVideoUrl }: AvatarSectionProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = React.useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);

  // Get avatar status
  const { data: status, refetch } = useQuery({
    queryKey: ['avatarStatus', questionId],
    queryFn: async () => {
      const response = await axios.get(
        `${config.apiBaseUrl}/interviews/questions/${questionId}/avatar-status`
      );
      return response.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 2000 : false;
    },
  });

  // Invoke avatar mutation
  const { mutate: invokeAvatar } = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${config.apiBaseUrl}/interviews/questions/${questionId}/invoke-avatar`,
        { text: question }
      );
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error invoking avatar:', error);
      setVideoError('Failed to generate avatar video. Please try refreshing the page.');
    },
  });

  // Auto-invoke avatar when component mounts if no video URL
  React.useEffect(() => {
    if (!initialVideoUrl && !status?.video_url && status?.status !== 'processing') {
      invokeAvatar();
    }
  }, [initialVideoUrl, status?.video_url, status?.status, invokeAvatar]);

  // Handle video playback
  React.useEffect(() => {
    if (videoRef.current && (initialVideoUrl || status?.video_url)) {
      setIsVideoLoading(true);
      setVideoError(null);
      setIsVideoPlaying(false);
      
      const video = videoRef.current;
      video.load();
      
      const playVideo = async () => {
        try {
          await video.play();
          setIsVideoPlaying(true);
        } catch (error) {
          console.error("Error playing video:", error);
          setVideoError("Failed to play video. Please try refreshing the page.");
        }
      };

      video.addEventListener('loadeddata', () => {
        setIsVideoLoading(false);
        playVideo();
      });

      video.addEventListener('error', () => {
        console.error("Video error:", video.error);
        setVideoError("Failed to load video. Please try refreshing the page.");
        setIsVideoLoading(false);
      });

      video.addEventListener('ended', () => {
        setIsVideoPlaying(false);
      });

      // Cleanup
      return () => {
        video.removeEventListener('loadeddata', () => setIsVideoLoading(false));
        video.removeEventListener('error', () => setVideoError("Failed to load video"));
        video.removeEventListener('ended', () => setIsVideoPlaying(false));
      };
    }
  }, [initialVideoUrl, status?.video_url]);

  const videoUrl = initialVideoUrl || status?.video_url;
  const isProcessing = isLoading || status?.status === 'processing';

  return (
    <Card className="h-full">
      <div className="p-6 flex flex-col h-full">
        {/* Avatar Display Area */}
        <div className="flex-1 bg-muted rounded-lg mb-4 flex items-center justify-center relative min-h-[300px]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Generating AI avatar video...
              </p>
            </div>
          ) : videoUrl ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-lg"
                controls
                playsInline
                style={{ display: isVideoLoading ? 'none' : 'block' }}
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              )}
              {videoError && (
                <Alert variant="destructive" className="absolute inset-x-4 top-4">
                  <AlertDescription>{videoError}</AlertDescription>
                </Alert>
              )}
              {!isVideoPlaying && !isVideoLoading && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm">
                  <button
                    onClick={() => videoRef.current?.play()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <span>Play Video</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 bg-slate-300 rounded-full flex items-center justify-center">
                <span className="text-2xl">AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Avatar will appear here
              </p>
            </div>
          )}
        </div>

        {/* Question Display */}
        <div className="bg-muted rounded-lg p-6">
          <p className="text-xl font-medium text-center">
            {isProcessing ? (
              <span className="inline-flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading question...
              </span>
            ) : (
              question
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}