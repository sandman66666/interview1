import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from datetime import datetime

logger = logging.getLogger(__name__)

class DIDService:
    def __init__(self):
        self.base_url = "https://api.d-id.com"
        # Use the exact authorization header that worked in the test
        self.headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": "Basic VTJGdVpHMWhia0J6WlhOemFXOXVMVFF5TG1OdmJROnB3YldHeGtUZ3I0ZnppRlNqRk81OQ=="
        }
        # Fallback videos for when API is unavailable
        self.fallback_videos = {
            0: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-explaining.mp4",
            1: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-presenting.mp4",
            2: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-interview.mp4",
            3: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-discussion.mp4",
            4: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-meeting.mp4"
        }

    async def create_avatar_video(
        self, 
        text: str, 
        source_url: Optional[str] = None,
        voice_id: str = "en-US-JennyNeural",
        voice_style: Optional[str] = None,
        webhook_url: Optional[str] = None
    ) -> str:
        """Create a new avatar video using D-ID API"""
        if not source_url:
            source_url = "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"

        url = f"{self.base_url}/talks"
        
        # Base payload that we know works
        payload = {
            "source_url": source_url,
            "script": {
                "type": "text",
                "subtitles": False,
                "provider": {
                    "type": "microsoft",
                    "voice_id": voice_id
                },
                "input": text
            },
            "config": {
                "fluent": False,
                "pad_audio": "0.0"
            }
        }

        # Only add voice_style if provided
        if voice_style:
            payload["script"]["provider"]["voice_config"] = {
                "style": voice_style
            }

        # Add webhook if provided
        if webhook_url:
            payload["webhook"] = webhook_url

        try:
            logger.info(f"Creating avatar video for text: {text[:50]}...")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request headers: {self.headers}")
            logger.info(f"Request payload: {payload}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=self.headers,
                    follow_redirects=True
                )
                
                # Log response details for debugging
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                logger.info(f"Response body: {response.text}")
                
                response.raise_for_status()
                
                data = response.json()
                logger.info(f"Successfully created avatar video with ID: {data.get('id')}")
                return data.get("id")
                
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = await self._get_error_detail(e.response)
            
            if status_code == 401:
                logger.error("Authentication failed with D-ID API")
                raise Exception("Invalid D-ID API credentials. Please check your API key.")
            elif status_code == 402:
                logger.warning("Insufficient credits in D-ID account, using fallback video")
                # Return a special ID that indicates we should use a fallback video
                return f"fallback_{hash(text) % len(self.fallback_videos)}"
            elif status_code == 400:
                logger.error(f"Bad request: {error_detail}")
                raise Exception(f"Invalid request parameters: {error_detail}")
            elif status_code == 451:
                logger.error(f"Content moderation failed: {error_detail}")
                raise Exception(f"Content moderation failed: {error_detail}")
            else:
                logger.error(f"HTTP error creating avatar: {error_detail}")
                raise Exception(f"Failed to create avatar video: {error_detail}")
            
        except Exception as e:
            logger.error(f"Unexpected error creating avatar: {str(e)}")
            raise Exception(f"Unexpected error creating avatar video: {str(e)}")

    async def get_video_url(self, talk_id: str, max_retries: int = 3) -> Optional[str]:
        """Get the URL of a generated video"""
        # Check if this is a fallback video ID
        if talk_id.startswith("fallback_"):
            try:
                fallback_index = int(talk_id.split("_")[1])
                return self.fallback_videos.get(fallback_index, self.fallback_videos[0])
            except (IndexError, ValueError):
                return self.fallback_videos[0]

        url = f"{self.base_url}/talks/{talk_id}"
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Checking status for talk ID: {talk_id} (attempt {attempt + 1}/{max_retries})")
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        url,
                        headers=self.headers,
                        follow_redirects=True
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    status = result.get("status")
                    logger.info(f"Talk status: {status}")
                    
                    if status == "done":
                        return result.get("result_url")
                    elif status == "error":
                        error_msg = result.get("error", {}).get("message", "Unknown error")
                        raise Exception(f"Video generation failed: {error_msg}")
                    elif status in ["started", "created"]:
                        logger.info(f"Video {status}, not ready yet")
                        return None
                    else:
                        logger.warning(f"Unknown status: {status}")
                        return None
                    
            except httpx.HTTPStatusError as e:
                if attempt == max_retries - 1:  # Last attempt
                    error_detail = await self._get_error_detail(e.response)
                    logger.error(f"HTTP error getting video status: {error_detail}")
                    raise Exception(f"Failed to get video status: {error_detail}")
                logger.warning(f"Attempt {attempt + 1} failed, retrying...")
                
            except Exception as e:
                if attempt == max_retries - 1:  # Last attempt
                    logger.error(f"Unexpected error getting video status: {str(e)}")
                    raise Exception(f"Unexpected error getting video status: {str(e)}")
                logger.warning(f"Attempt {attempt + 1} failed, retrying...")

    async def _get_error_detail(self, response: httpx.Response) -> str:
        """Extract detailed error message from response"""
        try:
            error_data = response.json()
            if isinstance(error_data, dict):
                if "error" in error_data:
                    return error_data["error"].get("message", str(response.status_code))
                return error_data.get("message", str(response.status_code))
            return str(response.status_code)
        except Exception:
            return f"HTTP {response.status_code}"