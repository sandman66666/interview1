from openai import AsyncOpenAI
import httpx
import logging
from fastapi import HTTPException
from typing import Dict, Any, Optional
import asyncio
from pathlib import Path
import tempfile
from ..core.config import settings

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        """Initialize OpenAI client with API key from settings"""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.supported_languages = [
            "en", "es", "fr", "de", "it", "pt", "nl", "ja", "ko", "zh"
        ]
        self.default_language = "en"
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    async def download_video(self, url: str) -> Path:
        """Download video from URL to temporary file"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()

                # Create temporary file
                temp_file = Path(tempfile.mktemp(suffix=".mp4"))
                temp_file.write_bytes(response.content)
                return temp_file

        except Exception as e:
            logger.error(f"Error downloading video: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to download video for transcription"
            )

    async def transcribe_video(
        self,
        video_url: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transcribe video using OpenAI Whisper API"""
        temp_file = None
        try:
            # Download video to temporary file
            temp_file = await self.download_video(video_url)

            # Set language parameter
            if language and language not in self.supported_languages:
                logger.warning(
                    f"Unsupported language: {language}. Using default: {self.default_language}"
                )
                language = self.default_language
            
            # Attempt transcription with retries
            for attempt in range(self.max_retries):
                try:
                    with open(temp_file, "rb") as audio_file:
                        transcript = await self.client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            language=language,
                            response_format="verbose_json",
                            timestamp_granularities=["word", "segment"]
                        )

                    return {
                        "text": transcript.text,
                        "segments": transcript.segments,
                        "words": transcript.words,
                        "language": transcript.language
                    }

                except Exception as e:
                    if attempt == self.max_retries - 1:
                        raise e
                    logger.warning(
                        f"Transcription attempt {attempt + 1} failed: {str(e)}. Retrying..."
                    )
                    await asyncio.sleep(self.retry_delay * (attempt + 1))

        except Exception as e:
            logger.error(f"Error transcribing video: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to transcribe video"
            )

        finally:
            # Clean up temporary file
            if temp_file and temp_file.exists():
                temp_file.unlink()

    async def get_supported_languages(self) -> Dict[str, list]:
        """Get list of supported languages"""
        return {
            "languages": self.supported_languages,
            "default": self.default_language
        }

    async def estimate_transcription_time(self, video_duration: float) -> Dict[str, Any]:
        """Estimate transcription processing time based on video duration"""
        # Base processing time (in seconds) plus overhead
        base_time = video_duration * 0.5  # Typically processes faster than real-time
        overhead = 5  # Fixed overhead for API calls, file handling, etc.
        
        estimated_time = base_time + overhead
        
        return {
            "estimated_seconds": estimated_time,
            "video_duration": video_duration,
            "message": f"Estimated processing time: {estimated_time:.1f} seconds"
        }

    async def validate_audio_format(self, file_path: Path) -> bool:
        """Validate if the audio format is supported by Whisper API"""
        supported_formats = [".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"]
        
        if file_path.suffix.lower() not in supported_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Supported formats: {', '.join(supported_formats)}"
            )
        
        return True

    async def get_transcription_status(self, task_id: str) -> Dict[str, Any]:
        """Get status of a transcription task (for future implementation of async processing)"""
        # This is a placeholder for future implementation of async processing
        # Currently, transcription is synchronous
        return {
            "status": "not_implemented",
            "message": "Async transcription status tracking not implemented yet"
        }