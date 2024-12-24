import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
from ..core.config import settings
import asyncio
from datetime import datetime, timedelta, UTC

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        """Initialize S3 client with credentials from settings"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    async def upload_file(self, file_path: Path, prefix: str) -> Dict[str, str]:
        """Upload a file to S3 bucket"""
        try:
            # Generate a unique key for the file
            key = f"{prefix}{file_path.name}"

            # Upload file to S3
            await asyncio.to_thread(
                self.s3_client.upload_file,
                str(file_path),
                self.bucket_name,
                key
            )

            # Generate URL
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

            return {
                "url": url,
                "key": key
            }

        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to storage"
            )

    async def create_multipart_upload(
        self,
        filename: str,
        content_type: str,
        prefix: str
    ) -> Dict[str, Any]:
        """Initialize a multipart upload"""
        try:
            key = f"{prefix}{filename}"
            
            # Create multipart upload
            response = await asyncio.to_thread(
                self.s3_client.create_multipart_upload,
                Bucket=self.bucket_name,
                Key=key,
                ContentType=content_type
            )

            return {
                "upload_id": response["UploadId"],
                "key": key
            }

        except Exception as e:
            logger.error(f"Error creating multipart upload: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize multipart upload"
            )

    async def get_presigned_upload_url(
        self,
        upload_id: str,
        key: str,
        part_number: int
    ) -> Dict[str, str]:
        """Get presigned URL for uploading a part"""
        try:
            url = await asyncio.to_thread(
                self.s3_client.generate_presigned_url,
                'upload_part',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key,
                    'UploadId': upload_id,
                    'PartNumber': part_number
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )

            return {"url": url}

        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate upload URL"
            )

    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Complete a multipart upload"""
        try:
            # Format parts information
            multipart_upload = {
                'Parts': [
                    {
                        'PartNumber': part['PartNumber'],
                        'ETag': part['ETag']
                    }
                    for part in parts
                ]
            }

            # Complete the multipart upload
            await asyncio.to_thread(
                self.s3_client.complete_multipart_upload,
                Bucket=self.bucket_name,
                Key=key,
                UploadId=upload_id,
                MultipartUpload=multipart_upload
            )

            # Generate URL for the uploaded file
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

            return {
                "url": url,
                "key": key
            }

        except Exception as e:
            logger.error(f"Error completing multipart upload: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to complete multipart upload"
            )

    async def abort_multipart_upload(self, key: str, upload_id: str):
        """Abort a multipart upload"""
        try:
            await asyncio.to_thread(
                self.s3_client.abort_multipart_upload,
                Bucket=self.bucket_name,
                Key=key,
                UploadId=upload_id
            )
        except Exception as e:
            logger.error(f"Error aborting multipart upload: {str(e)}")
            # Log error but don't raise exception as this is cleanup

    async def delete_file(self, key: str):
        """Delete a file from S3"""
        try:
            await asyncio.to_thread(
                self.s3_client.delete_object,
                Bucket=self.bucket_name,
                Key=key
            )
        except Exception as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to delete file"
            )

    async def get_presigned_download_url(
        self,
        key: str,
        expiration: int = 3600
    ) -> str:
        """Generate a presigned URL for downloading a file"""
        try:
            url = await asyncio.to_thread(
                self.s3_client.generate_presigned_url,
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"Error generating presigned download URL: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate download URL"
            )

    async def check_file_exists(self, key: str) -> bool:
        """Check if a file exists in S3"""
        try:
            await asyncio.to_thread(
                self.s3_client.head_object,
                Bucket=self.bucket_name,
                Key=key
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error(f"Error checking file existence: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to check file existence"
                )