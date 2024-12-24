from openai import OpenAI
import logging
import tempfile
import httpx
from pathlib import Path
from fastapi import HTTPException
import asyncio
from typing import Optional, Dict, Any
import os
from ..core.config import settings

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.client = None
        self.supported_languages = ["en"]  # Add more languages as needed
        self.temp_dir = Path("temp_transcriptions")
        self.temp_dir.mkdir(exist_ok=True)

    def _ensure_client(self):
        """Ensure OpenAI client is initialized"""
        if not self.client:
            if not settings.OPENAI_API_KEY:
                logger.warning("OpenAI API key not configured")
                return False
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return True

    async def download_video(self, url: str) -> Path:
        """Download video from URL to temporary file"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()

                # Create temporary file
                temp_file = self.temp_dir / f"video_{os.urandom(8).hex()}.mp4"
                with open(temp_file, "wb") as f:
                    f.write(response.content)

                return temp_file

        except httpx.HTTPError as e:
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
        """Transcribe video to text"""
        if not settings.ENABLE_TRANSCRIPTION:
            logger.info("Transcription service is disabled")
            return {"text": "", "language": language or "en", "segments": []}

        if not self._ensure_client():
            logger.warning("Transcription skipped - OpenAI API key not configured")
            return {"text": "", "language": language or "en", "segments": []}

        temp_file = None
        try:
            # Download video
            temp_file = await self.download_video(video_url)

            # Transcribe using OpenAI's API
            with open(temp_file, "rb") as audio_file:
                transcription = await asyncio.to_thread(
                    self.client.audio.transcriptions.create,
                    file=audio_file,
                    model="whisper-1",
                    language=language if language in self.supported_languages else None,
                    response_format="verbose_json"
                )

            # Process results
            result = {
                "text": transcription.text,
                "language": transcription.language,
                "segments": [
                    {
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text
                    }
                    for segment in transcription.segments
                ]
            }

            return result

        except Exception as e:
            logger.error(f"Error transcribing video: {str(e)}")
            if isinstance(e, openai.APIError):
                raise HTTPException(
                    status_code=503,
                    detail="OpenAI service temporarily unavailable"
                )
            raise HTTPException(
                status_code=500,
                detail="Failed to transcribe video"
            )

        finally:
            # Clean up temporary file
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception as e:
                    logger.error(f"Error cleaning up temporary file: {str(e)}")

    async def cleanup_temp_files(self, max_age_hours: int = 24):
        """Clean up old temporary files"""
        try:
            current_time = asyncio.get_event_loop().time()
            for file_path in self.temp_dir.glob("*"):
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_hours * 3600:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        logger.error(f"Error deleting file {file_path}: {str(e)}")
        except Exception as e:
            logger.error(f"Error cleaning up temporary files: {str(e)}")
            # Non-critical error, just log it

    async def get_supported_languages(self) -> list:
        """Get list of supported languages"""
        return self.supported_languages.copy()

    async def estimate_processing_time(self, video_duration: float) -> float:
        """Estimate processing time in seconds based on video duration"""
        # Rough estimation based on API processing time
        base_processing_factor = 0.5  # Typically processes at 2x real-time
        overhead_seconds = 2.0  # Fixed overhead for API calls and file handling
        
        estimated_time = (video_duration * base_processing_factor) + overhead_seconds
        return estimated_time