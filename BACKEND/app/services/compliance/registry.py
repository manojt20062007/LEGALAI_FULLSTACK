import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
from app.schemas.inspection import RuleDefinition, RuleSource, CheckType, RuleSeverity

logger = logging.getLogger(__name__)

DEFAULT_RULES_PATH = Path(__file__).resolve().parent.parent.parent.parent / "compliance_rules" / "rules.json"


class RuleRegistry:
    """
    Registry for managing configurable, versioned, source-backed Legal Metrology compliance rules.
    Loads rules from JSON and validates them against the RuleDefinition schema.
    """

    def __init__(self, rules_file_path: Optional[Path] = None):
        self.rules_file_path = rules_file_path or DEFAULT_RULES_PATH
        self._rules: Dict[str, RuleDefinition] = {}
        self._alias_map: Dict[str, str] = {
            "RULE-MRP-PRESENT": "LM-PC-001",
            "RULE-NET-QTY-PRESENT": "LM-PC-002",
            "RULE-MANUFACTURER-PRESENT": "LM-PC-003",
            "RULE-ORIGIN-PRESENT": "LM-PC-004",
            "RULE-CONSUMER-CARE-PRESENT": "LM-PC-005",
            "RULE-UNIT-VALID": "LM-PC-006",
            "RULE-PRODUCT-NAME-PRESENT": "LM-PC-007",
            "RULE-MFG-DATE-PRESENT": "LM-PC-008",
        }
        self.load_rules()

    def load_rules(self) -> None:
        """Loads and validates rules from the configured JSON file."""
        self._rules.clear()
        if not self.rules_file_path.exists():
            logger.warning(f"Rules file not found at {self.rules_file_path}. Loading fallback default rules.")
            self._load_fallback_rules()
            return

        try:
            with open(self.rules_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for item in data:
                rule = RuleDefinition.model_validate(item)
                self._rules[rule.rule_id] = rule

            logger.info(f"Loaded {len(self._rules)} compliance rules from {self.rules_file_path}")
        except Exception as e:
            logger.error(f"Failed to load compliance rules from {self.rules_file_path}: {e}")
            self._load_fallback_rules()

    def _load_fallback_rules(self) -> None:
        """Fallback in case rules.json is inaccessible."""
        fallback = [
            RuleDefinition(
                rule_id="LM-PC-001",
                name="Maximum Retail Price (MRP) Declaration",
                description="Mandatory declaration of retail sale price inclusive of all taxes.",
                field="mrp",
                check_type=CheckType.REQUIRED_FIELD,
                severity=RuleSeverity.ERROR,
                source=RuleSource(
                    document="Legal Metrology (Packaged Commodities) Rules, 2011",
                    reference="Rule 6(1)(e)",
                    source_url="https://consumeraffairs.gov.in/pages/legal-metrology-act",
                    version="Consolidated Rules 2011",
                    effective_from="2011-04-01",
                ),
                enabled=True,
            ),
            RuleDefinition(
                rule_id="LM-PC-002",
                name="Net Quantity Declaration",
                description="Mandatory declaration of net quantity.",
                field="net_quantity",
                check_type=CheckType.REQUIRED_FIELD,
                severity=RuleSeverity.ERROR,
                source=RuleSource(
                    document="Legal Metrology (Packaged Commodities) Rules, 2011",
                    reference="Rule 6(1)(d) & Rule 11",
                    source_url="https://consumeraffairs.gov.in/pages/legal-metrology-act",
                    version="Consolidated Rules 2011",
                    effective_from="2011-04-01",
                ),
                enabled=True,
                parameters={"require_unit": True},
            ),
            RuleDefinition(
                rule_id="LM-PC-003",
                name="Manufacturer / Packer Details",
                description="Mandatory declaration of manufacturer or packer details.",
                field="manufacturer",
                check_type=CheckType.REQUIRED_FIELD,
                severity=RuleSeverity.ERROR,
                source=RuleSource(
                    document="Legal Metrology (Packaged Commodities) Rules, 2011",
                    reference="Rule 6(1)(a)",
                    source_url="https://consumeraffairs.gov.in/pages/legal-metrology-act",
                    version="Consolidated Rules 2011",
                    effective_from="2011-04-01",
                ),
                enabled=True,
            ),
            RuleDefinition(
                rule_id="LM-PC-004",
                name="Country of Origin Declaration",
                description="Mandatory declaration of Country of Origin.",
                field="country_of_origin",
                check_type=CheckType.REQUIRED_FIELD,
                severity=RuleSeverity.ERROR,
                source=RuleSource(
                    document="Legal Metrology (Packaged Commodities) Rules, 2011",
                    reference="Rule 6(10)",
                    source_url="https://consumeraffairs.gov.in/pages/legal-metrology-act",
                    version="Amendment Rules 2017",
                    effective_from="2018-01-01",
                ),
                enabled=True,
            ),
        ]
        for r in fallback:
            self._rules[r.rule_id] = r

    def get_all_rules(self) -> List[RuleDefinition]:
        return list(self._rules.values())

    def get_enabled_rules(self) -> List[RuleDefinition]:
        return [r for r in self._rules.values() if r.enabled]

    def get_rule(self, rule_id: str) -> Optional[RuleDefinition]:
        # Support both direct ID and legacy alias lookup
        canonical_id = self._alias_map.get(rule_id, rule_id)
        return self._rules.get(canonical_id)

    def reload(self) -> None:
        self.load_rules()


# Global Singleton Registry Instance
default_rule_registry = RuleRegistry()
