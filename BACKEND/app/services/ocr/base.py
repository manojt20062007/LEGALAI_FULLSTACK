from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Union
from pathlib import Path


@dataclass
class OCRResult:
    text: str
    confidence: float
    raw_detections: List[Dict[str, Any]] = field(default_factory=list)


class OCRService(ABC):
    @abstractmethod
    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        """Extract text and confidence score from image data or image file path."""
        pass
