import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON, Index
from app.db.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="officer", nullable=False) # 'admin' or 'officer'
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), nullable=True) # Temporarily nullable for backward compatibility
    status = Column(String(20), nullable=False, default="queued", index=True)
    image_path = Column(String(512), nullable=True)   # nullable — multi-panel uploads may have no single primary path
    image_url = Column(String(1024), nullable=True)
    image_paths = Column(JSON, nullable=True)
    image_urls = Column(JSON, nullable=True)
    
    ocr_text = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)
    compliance_result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    # Denormalised search fields — populated by worker after extraction
    product_name = Column(String(256), nullable=True, index=True)
    brand = Column(String(128), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "status": self.status,
            "image_path": self.image_path,
            "image_url": self.image_url,
            "image_paths": self.image_paths or ([self.image_path] if self.image_path else []),
            "image_urls": self.image_urls or ([self.image_url] if self.image_url else []),
            "ocr_text": self.ocr_text,
            "extracted_data": self.extracted_data,
            "compliance_result": self.compliance_result,
            "error_message": self.error_message,
            "product_name": self.product_name,
            "brand": self.brand,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
