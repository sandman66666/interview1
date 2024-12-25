import { useState, useEffect } from "react";
import { config } from "~/config";

interface AvatarState {
  videoUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAvatarResult extends AvatarState {
  generateAvatar: (questionId: string) => Promise<void>;
  resetError: () => void;
}

export function useAvatar(): UseAvatarResult {
  const [state, setState] = useState<AvatarState>({
    videoUrl: null,
    isLoading: false,
    error: null,
  });

  const resetError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const generateAvatar = async (questionId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First, generate the avatar video
      const generateResponse = await fetch(
        `${config.apiBaseUrl}${config.endpoints.recordings}/question/${questionId}/avatar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!generateResponse.ok) {
        throw new Error("Failed to generate avatar video");
      }

      const { video_url, avatar_id } = await generateResponse.json();

      // Update state with the video URL
      setState(prev => ({
        ...prev,
        videoUrl: video_url,
        isLoading: false,
      }));

    } catch (error) {
      console.error("Error generating avatar:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to generate avatar",
        isLoading: false,
      }));
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clean up any resources if needed
      setState({
        videoUrl: null,
        isLoading: false,
        error: null,
      });
    };
  }, []);

  return {
    ...state,
    generateAvatar,
    resetError,
  };
}