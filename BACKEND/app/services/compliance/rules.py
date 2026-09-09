"""
Backward compatibility layer for compliance rules.
Exposes RuleRegistry, RuleEvaluator, and default definitions.
"""

from app.schemas.inspection import (
    RuleDefinition as ComplianceRule,
    RuleStatus,
    RuleSeverity,
    ExtractedProductData,
)
from app.services.compliance.registry import default_rule_registry
from app.services.compliance.evaluator import RuleEvaluator

# Export enabled rules for legacy code referencing DEFAULT_COMPLIANCE_RULES
DEFAULT_COMPLIANCE_RULES = default_rule_registry.get_enabled_rules()
