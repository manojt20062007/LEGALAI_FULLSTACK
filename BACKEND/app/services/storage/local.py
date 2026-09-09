import os
import shutil
from typing import BinaryIO, Union
from pathlib import Path
from app.services.storage.base import StorageService
from app.core.config import settings


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload(self, file_data: Union[bytes, BinaryIO], filename: str, content_type: str = "image/jpeg") -> str:
        # Sanitize filename and create destination path
        safe_filename = os.path.basename(filename)
        dest_path = self.base_dir / safe_filename
        
        if isinstance(file_data, bytes):
            with open(dest_path, "wb") as f:
                f.write(file_data)
        else:
            file_data.seek(0)
            with open(dest_path, "wb") as f:
                shutil.copyfileobj(file_data, f)
                
        return safe_filename

    def download(self, storage_path: str) -> bytes:
        file_path = self.base_dir / os.path.basename(storage_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found in storage: {storage_path}")
        with open(file_path, "rb") as f:
            return f.read()

    def get_url(self, storage_path: str) -> str:
        # If the path is already an absolute URL (like Cloudinary), return it as-is
        if storage_path.startswith("http://") or storage_path.startswith("https://") or storage_path.startswith("data:"):
            return storage_path
            
        # Returns the API file serving URL or relative path
        safe_name = os.path.basename(storage_path)
        return f"/api/v1/storage/files/{safe_name}"
