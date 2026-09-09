import io
import os
from typing import BinaryIO, Union
from datetime import timedelta
import logging
from app.services.storage.base import StorageService
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from minio import Minio
    from minio.error import S3Error
    HAS_MINIO = True
except ImportError:
    HAS_MINIO = False


class MinIOStorageService(StorageService):
    def __init__(
        self,
        endpoint: str = None,
        access_key: str = None,
        secret_key: str = None,
        bucket: str = None,
        secure: bool = False,
    ):
        if not HAS_MINIO:
            raise RuntimeError("minio package is not installed. Please install 'minio'.")

        self.endpoint = endpoint or settings.STORAGE_ENDPOINT
        self.access_key = access_key or settings.STORAGE_ACCESS_KEY
        self.secret_key = secret_key or settings.STORAGE_SECRET_KEY
        self.bucket = bucket or settings.STORAGE_BUCKET
        self.secure = secure if secure is not None else settings.STORAGE_SECURE

        self.client = Minio(
            endpoint=self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"Created MinIO bucket: {self.bucket}")
        except Exception as e:
            logger.warning(f"Failed to check/create MinIO bucket: {e}")

    def upload(self, file_data: Union[bytes, BinaryIO], filename: str, content_type: str = "image/jpeg") -> str:
        safe_filename = os.path.basename(filename)
        if isinstance(file_data, bytes):
            data_stream = io.BytesIO(file_data)
            length = len(file_data)
        else:
            file_data.seek(0, io.SEEK_END)
            length = file_data.tell()
            file_data.seek(0)
            data_stream = file_data

        self.client.put_object(
            bucket_name=self.bucket,
            object_name=safe_filename,
            data=data_stream,
            length=length,
            content_type=content_type,
        )
        return safe_filename

    def download(self, storage_path: str) -> bytes:
        safe_name = os.path.basename(storage_path)
        response = self.client.get_object(self.bucket, safe_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def get_url(self, storage_path: str) -> str:
        safe_name = os.path.basename(storage_path)
        try:
            # Generate presigned GET url valid for 24 hours
            return self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=safe_name,
                expires=timedelta(hours=24),
            )
        except Exception:
            scheme = "https" if self.secure else "http"
            return f"{scheme}://{self.endpoint}/{self.bucket}/{safe_name}"
