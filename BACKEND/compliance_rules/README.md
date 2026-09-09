# Legal Metrology Compliance Rule Registry

This directory contains the versioned, source-backed compliance rules for **LM-Verify** under the **Legal Metrology (Packaged Commodities) Rules, 2011** (Department of Consumer Affairs, Government of India).

---

## 🏛️ Official Source Reference

All rule definitions are derived directly from the official publications of the **Department of Consumer Affairs**:
- **Official Portal**: [https://consumeraffairs.gov.in/pages/legal-metrology-act](https://consumeraffairs.gov.in/pages/legal-metrology-act)
- **Principal Statutory Instrument**: Legal Metrology (Packaged Commodities) Rules, 2011 (G.S.R. 202(E), effective 01-04-2011)
- **Amendments**: Legal Metrology (Packaged Commodities) Amendment Rules, 2017 (G.S.R. 629(E), effective 01-01-2018), and subsequent consolidated notifications.

---

## 📋 Rule Structure

Rules are declared in [`rules.json`](rules.json) as a list of validated JSON objects conforming to the `RuleDefinition` schema:

```json
{
  "rule_id": "LM-PC-001",
  "name": "Maximum Retail Price (MRP) Declaration",
  "description": "Mandatory declaration of the retail sale price of the package inclusive of all taxes in Indian Rupees.",
  "field": "mrp",
  "check_type": "REQUIRED_FIELD",
  "severity": "ERROR",
  "source": {
    "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
    "reference": "Rule 6(1)(e)",
    "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
    "version": "Consolidated Rules 2011",
    "effective_from": "2011-04-01"
  },
  "enabled": true,
  "parameters": {
    "min_length": 1,
    "pattern": "(?:₹|Rs\\.?|INR)?\\s*[0-9,]+(?:\\.[0-9]{1,2})?"
  }
}
```

### Key Fields:
- **`rule_id`**: Unique statutory identifier (e.g. `LM-PC-001`).
- **`field`**: Target field extracted from label data (`mrp`, `net_quantity`, `manufacturer`, `country_of_origin`, `consumer_care`, `unit`, `product_name`).
- **`check_type`**: Evaluator strategy (`REQUIRED_FIELD`, `FIELD_PRESENT`, `FIELD_PATTERN`, `FIELD_VALUE`, `CUSTOM`).
- **`severity`**: 
  - `ERROR`: Mandatory statutory requirement. Failure triggers overall `NON_COMPLIANT` status.
  - `WARNING`: Advisory requirement (e.g. consumer care or unit format check).
  - `INFO`: Informational check.
- **`source`**: Full statutory traceability metadata (`document`, `reference`, `source_url`, `version`, `effective_from`).
- **`enabled`**: Boolean flag to enable/disable rules without altering code.
- **`parameters`**: Dynamic configuration for pattern matching, allowed units, minimum lengths, or uncertainty thresholds.

---

## ➕ How to Add a New Rule

1. Open `compliance_rules/rules.json`.
2. Append a new rule object with an incremented `rule_id` (e.g., `LM-PC-008`).
3. Fill in the statutory clause reference from the official publication.
4. Set appropriate `check_type`, `severity`, and `parameters`.
5. Run tests: `pytest tests/test_compliance_engine.py` to verify the rule loads and evaluates properly.

---

## 🔄 How to Update a Rule

- **Statutory Amendments**: When rules are amended by government gazette notifications, update the rule's `source.version`, `source.effective_from`, and `source.reference` accordingly.
- **Disabling a Rule**: Set `"enabled": false` to temporarily deactivate a rule without deleting historical definitions.

---

## ⚙️ How the Engine Evaluates Rules

1. **Decoupling**: OCR extracts raw text -> Extractor structures fields into `ExtractedProductData` -> Compliance Engine evaluates structured data against `RuleRegistry`.
2. **Evaluator Pipeline**:
   - `REQUIRED_FIELD`: Validates presence and non-emptiness.
   - `FIELD_PATTERN`: Validates against configured regex pattern.
   - `FIELD_VALUE`: Checks if value belongs to standard metric units (e.g. `g`, `kg`, `ml`, `l`, `N`).
   - `CUSTOM`: Handles composite constraints (e.g. net quantity paired with standard unit).
3. **Traceability**: Every output `ComplianceFinding` retains the statutory `source` information for audit trails and frontend display.

---

## 🔍 Uncertainty & Low Confidence Handling

If an image is blurry or OCR confidence is below the configured threshold (`min_confidence`, default `0.60`):
- Missing fields will **not** trigger a false `FAIL`.
- The rule outputs `NOT_CHECKED` or `WARNING` with the observation:
  `"Information could not be reliably extracted (OCR confidence: ...); manual review recommended."`
- The overall inspection status resolves to **`NEEDS_REVIEW`**.

---

## ⚖️ Legal Disclaimer

All assessments are automated preliminary checks. Official statutory certifications must be conducted by designated Legal Metrology officers.
