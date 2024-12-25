import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from ..core.config import settings
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import mimetypes
from datetime import datetime, timedelta, UTC

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.AWS_BUCKET_NAME
        self.max_upload_size = 500 * 1024 * 1024  # 500MB
        self.default_expiry = 3600  # 1 hour
        self.temp_dir = Path("temp_storage")
        self.temp_dir.mkdir(exist_ok=True)

    def _ensure_client(self) -> bool:
        """Ensure S3 client is initialized"""
        if not self.s3_client:
            if not all([
                settings.AWS_ACCESS_KEY_ID,
                settings.AWS_SECRET_ACCESS_KEY,
                settings.AWS_BUCKET_NAME
            ]):
                logger.warning("AWS credentials not fully configured")
                return False
            
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {str(e)}")
                return False
        return True

    async def upload_file(self, file_path: Path, key_prefix: str = "recordings/") -> Dict[str, str]:
        """Upload a file to S3 or store locally if S3 is not configured"""
        try:
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            file_name = file_path.name
            content_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

            if not self._ensure_client():
                # Fall back to local storage
                local_path = self.temp_dir / f"{timestamp}_{file_name}"
                local_path.write_bytes(file_path.read_bytes())
                return {
                    "url": str(local_path),
                    "key": str(local_path.relative_to(self.temp_dir)),
                    "content_type": content_type
                }

            s3_key = f"{key_prefix}{timestamp}_{file_name}"
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'Metadata': {
                        'uploaded_at': timestamp,
                        'original_filename': file_name
                    }
                }
            )

            url = self.generate_presigned_url(s3_key)
            return {
                "url": url,
                "key": s3_key,
                "content_type": content_type
            }

        except ClientError as e:
            logger.error(f"AWS S3 error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload file to storage")
        except Exception as e:
            logger.error(f"Unexpected error uploading file: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error during file upload")

    def generate_presigned_url(
        self,
        s3_key: str,
        expiry: int = None,
        http_method: str = 'GET'
    ) -> str:
        """Generate a presigned URL for accessing a file"""
        if not self._ensure_client():
            # For local files, just return the path
            return str(self.temp_dir / s3_key)

        try:
            expiry = expiry or self.default_expiry
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiry,
                HttpMethod=http_method
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate access URL")

    async def delete_file(self, s3_key: str) -> bool:
        """Delete a file from storage"""
        try:
            if not self._ensure_client():
                # Handle local file deletion
                local_path = self.temp_dir / s3_key
                if local_path.exists():
                    local_path.unlink()
                return True

            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete file from storage")

    async def get_file_metadata(self, s3_key: str) -> Dict[str, Any]:
        """Get metadata for a file in storage"""
        try:
            if not self._ensure_client():
                # Handle local file metadata
                local_path = self.temp_dir / s3_key
                if not local_path.exists():
                    raise HTTPException(status_code=404, detail="File not found")
                return {
                    "content_type": mimetypes.guess_type(local_path)[0],
                    "content_length": local_path.stat().st_size,
                    "last_modified": datetime.fromtimestamp(local_path.stat().st_mtime, UTC),
                    "metadata": {}
                }

            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return {
                "content_type": response.get('ContentType'),
                "content_length": response.get('ContentLength'),
                "last_modified": response.get('LastModified'),
                "metadata": response.get('Metadata', {})
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise HTTPException(status_code=404, detail="File not found")
            logger.error(f"Error getting file metadata: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get file metadata")

    async def create_multipart_upload(
        self,
        file_name: str,
        content_type: str,
        key_prefix: str = "recordings/"
    ) -> Dict[str, str]:
        """Initialize a multipart upload"""
        if not self._ensure_client():
            raise HTTPException(
                status_code=501,
                detail="Multipart uploads not supported in local storage mode"
            )

        try:
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            s3_key = f"{key_prefix}{timestamp}_{file_name}"

            response = self.s3_client.create_multipart_upload(
                Bucket=self.bucket_name,
                Key=s3_key,
                ContentType=content_type,
                Metadata={
                    'uploaded_at': timestamp,
                    'original_filename': file_name
                }
            )

            return {
                "upload_id": response["UploadId"],
                "key": s3_key
            }
        except ClientError as e:
            logger.error(f"Error creating multipart upload: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to initialize upload")

    async def generate_presigned_upload_url(
        self,
        s3_key: str,
        upload_id: str,
        part_number: int
    ) -> str:
        """Generate a presigned URL for uploading a part"""
        if not self._ensure_client():
            raise HTTPException(
                status_code=501,
                detail="Presigned URLs not supported in local storage mode"
            )

        try:
            url = self.s3_client.generate_presigned_url(
                'upload_part',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'UploadId': upload_id,
                    'PartNumber': part_number
                },
                ExpiresIn=3600
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating upload URL: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate upload URL")

    async def complete_multipart_upload(
        self,
        s3_key: str,
        upload_id: str,
        parts: list
    ) -> Dict[str, str]:
        """Complete a multipart upload"""
        if not self._ensure_client():
            raise HTTPException(
                status_code=501,
                detail="Multipart uploads not supported in local storage mode"
            )

        try:
            response = self.s3_client.complete_multipart_upload(
                Bucket=self.bucket_name,
                Key=s3_key,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )

            url = self.generate_presigned_url(s3_key)
            return {
                "url": url,
                "key": s3_key,
                "etag": response.get("ETag", "")
            }
        except ClientError as e:
            logger.error(f"Error completing multipart upload: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to complete upload")