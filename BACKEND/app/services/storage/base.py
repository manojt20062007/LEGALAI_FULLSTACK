from abc import ABC, abstractmethod
from typing import BinaryIO, Union


class StorageService(ABC):
    @abstractmethod
    def upload(self, file_data: Union[bytes, BinaryIO], filename: str, content_type: str = "image/jpeg") -> str:
        """Upload file and return the storage path/key."""
        pass

    @abstractmethod
    def download(self, storage_path: str) -> bytes:
        """Download file and return bytes."""
        pass

    @abstractmethod
    def get_url(self, storage_path: str) -> str:
        """Get accessible URL or local path for the stored file."""
        pass
