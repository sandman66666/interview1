from pathlib import Path
import logging
from fastapi import HTTPException, UploadFile
import asyncio
from typing import Optional, Dict, Any
import os
import aiofiles
from datetime import datetime, UTC
import subprocess
import json

logger = logging.getLogger(__name__)

class VideoService:
    def __init__(self):
        self.supported_formats = ['.mp4', '.webm', '.mov']
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.temp_dir = Path("temp_videos")
        self.temp_dir.mkdir(exist_ok=True)

    async def validate_video(self, file: UploadFile) -> bool:
        """Validate video format and size"""
        try:
            # Check file extension
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in self.supported_formats:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format. Supported formats: {', '.join(self.supported_formats)}"
                )

            # Check file size
            content = await file.read()
            await file.seek(0)  # Reset file pointer
            if len(content) > self.max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {self.max_file_size / 1024 / 1024}MB"
                )

            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating video: {str(e)}")
            raise HTTPException(status_code=500, detail="Error validating video file")

    async def compress_video(self, file: UploadFile) -> Path:
        """Compress video to standard format"""
        try:
            # Create temporary file
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            temp_input = self.temp_dir / f"input_{timestamp}{Path(file.filename).suffix}"
            temp_output = self.temp_dir / f"compressed_{timestamp}.mp4"

            # Save uploaded file
            async with aiofiles.open(temp_input, 'wb') as out_file:
                content = await file.read()
                await out_file.write(content)

            # Compress video using ffmpeg
            try:
                cmd = [
                    'ffmpeg',
                    '-i', str(temp_input),
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-b:v', '1000k',
                    '-b:a', '128k',
                    '-threads', '0',
                    '-y',  # Overwrite output file if exists
                    str(temp_output)
                ]

                # Run ffmpeg command
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()

                if process.returncode != 0:
                    logger.error(f"FFmpeg error: {stderr.decode()}")
                    raise HTTPException(
                        status_code=500,
                        detail="Error compressing video"
                    )

                return temp_output

            finally:
                # Clean up input file
                if temp_input.exists():
                    temp_input.unlink()

        except Exception as e:
            logger.error(f"Error compressing video: {str(e)}")
            # Clean up any temporary files
            for temp_file in [temp_input, temp_output]:
                if temp_file.exists():
                    temp_file.unlink()
            raise HTTPException(status_code=500, detail="Error compressing video file")

    async def get_video_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get video metadata using ffprobe"""
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                str(file_path)
            ]

            # Run ffprobe command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                logger.error(f"FFprobe error: {stderr.decode()}")
                raise HTTPException(
                    status_code=500,
                    detail="Error getting video metadata"
                )

            probe = json.loads(stdout.decode())
            video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
            
            return {
                'duration': float(probe['format']['duration']),
                'width': int(video_info['width']),
                'height': int(video_info['height']),
                'codec': video_info['codec_name'],
                'size': os.path.getsize(file_path)
            }

        except Exception as e:
            logger.error(f"Error getting video metadata: {str(e)}")
            raise HTTPException(status_code=500, detail="Error analyzing video file")

    async def cleanup_temp_files(self, max_age_hours: int = 24):
        """Clean up old temporary files"""
        try:
            current_time = datetime.now(UTC)
            for file_path in self.temp_dir.glob('*'):
                file_age = current_time - datetime.fromtimestamp(
                    file_path.stat().st_mtime,
                    UTC
                )
                if file_age.total_seconds() > max_age_hours * 3600:
                    file_path.unlink()

        except Exception as e:
            logger.error(f"Error cleaning up temporary files: {str(e)}")
            # Non-critical error, just log it