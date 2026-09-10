from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class InspectionStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ComplianceOverallStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class RuleStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    NOT_CHECKED = "NOT_CHECKED"


class RuleSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class CheckType(str, Enum):
    REQUIRED_FIELD = "REQUIRED_FIELD"
    FIELD_PRESENT = "FIELD_PRESENT"
    FIELD_PATTERN = "FIELD_PATTERN"
    FIELD_VALUE = "FIELD_VALUE"
    CUSTOM = "CUSTOM"


class RuleSource(BaseModel):
    document: str
    reference: str
    source_url: Optional[str] = None
    version: Optional[str] = None
    effective_from: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RuleDefinition(BaseModel):
    rule_id: str
    name: str
    description: str
    field: str
    check_type: CheckType
    severity: RuleSeverity
    source: RuleSource
    enabled: bool = True
    parameters: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ExtractedProductData(BaseModel):
    product_name: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    mrp: Optional[str] = None
    net_quantity: Optional[str] = None
    unit: Optional[str] = None
    country_of_origin: Optional[str] = None
    consumer_care: Optional[str] = None
    mfg_date: Optional[str] = None
    batch_number: Optional[str] = None
    best_before: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReadabilityAnalysis(BaseModel):
    readability_score: float = Field(ge=0.0, le=100.0, default=95.0)
    estimated_font_size_pt: float = Field(default=8.5)
    min_height_compliant: bool = True
    contrast_score: float = Field(ge=0.0, le=100.0, default=90.0)
    rule_9_schedule_ii_status: str = "COMPLIANT"
    notes: str = "Declaration numeral heights and clarity satisfy Rule 9 & Schedule II minimum standards."

    model_config = ConfigDict(from_attributes=True)


class ComplianceFinding(BaseModel):
    rule_id: str
    field: str
    status: RuleStatus
    severity: RuleSeverity
    message: str
    source: Optional[RuleSource] = None

    model_config = ConfigDict(from_attributes=True)


class ComplianceResult(BaseModel):
    overall_status: ComplianceOverallStatus
    confidence: float = Field(ge=0.0, le=1.0)
    product: ExtractedProductData
    readability: Optional[ReadabilityAnalysis] = None
    ocr_text: Optional[str] = None
    findings: List[ComplianceFinding] = []

    model_config = ConfigDict(from_attributes=True)


class InspectionCreateRequest(BaseModel):
    image_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)


class InspectionCreateResponse(BaseModel):
    id: str
    status: InspectionStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionDetailResponse(BaseModel):
    id: str
    status: InspectionStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    image_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    result: Optional[ComplianceResult] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str
    version: Optional[str] = None
    timestamp: Optional[datetime] = None
