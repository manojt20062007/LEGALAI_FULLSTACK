import re
from typing import Dict, Optional, Tuple, Any, List
from app.schemas.inspection import ExtractedProductData


class LabelExtractor:
    """
    Rule-based field extractor for Packaged Commodities under Legal Metrology Rules, 2011.
    Uses regex, OCR-noise tolerance heuristics, and statutory unit standardizers.
    """

    # MRP Patterns (Tolerant to OCR misreads like MR?, M.RP., red text, dot-matrix, trailing /-, e.20/-)
    MRP_PATTERNS = [
        re.compile(r"(?:M[\.\s]?[RP][\.\s]?[P\?]?|Maximum\s*Retail\s*Price)\s*[:\-=;]?\s*(?:Rs\.?|₹|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE),
        re.compile(r"(?:Rs\.?|₹|INR|e\.|R\s|Rs;)\s*[:\.\-=;\n\s]*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:\/[-=]?)?", re.IGNORECASE),
        re.compile(r"(?:₹|Rs\.?|Rs;)\s*[:\.\-=;\n\s]*([0-9]+(?:\.[0-9]{1,2})?)", re.IGNORECASE),
        re.compile(r"\b([0-9]+(?:\.[0-9]{1,2})?)\s*\/\-\b"),
        re.compile(r"\bMRP\s*[:\-\s=;\n]*([0-9]+(?:\.[0-9]{1,2})?)\b", re.IGNORECASE),
        re.compile(r"(?:M\.?R\.?P\.?|MRP)\s*(?:[^\d]{0,30}?)(\d+(?:\.\d{1,2})?)", re.IGNORECASE),
    ]

    # Net Quantity and Unit Patterns (Includes count, pieces, lead tubes, pencils, standard units)
    NET_QTY_PATTERNS = [
        re.compile(
            r"(?:Net\s*(?:Quantity|Qty|Weight|Wt|Content|Contents|Vol|Volume)|NET\s*QTY|NETQTY)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:Contains?|Package\s*contains?|Contents?)\s*[:\-]?\s*(?:[^\d\n\r]*?)(\d+(?:\.\d+)?)\s*([a-zA-Z]+)",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|grams|ml|l|ltr|litre|litres|pieces|pcs|count|N|U|units|pencils?|pens?|lead\s*tubes?|refills?)\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:with|including|inside)\s*([0-9]+)\s*(lead\s*tubes?|pencils?|pens?|pieces?|units?|refills?)",
            re.IGNORECASE,
        ),
    ]

    # Manufacturer / Packer Patterns (Includes 'A Quality product from', 'Marketed by', etc.)
    MFG_PATTERNS = [
        re.compile(
            r"(?:Manufactured(?:\s*by)?|Mfg\.?\s*by|Mfd\.?\s*by|Packed(?:\s*by)?|Pkd\.?\s*by|Marketed(?:\s*by)?|A\s*Quality\s*product\s*from|Product\s*of)\s*[:\-]?\s*([^\n\r]+)",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:FIGO\s*IMPEX|ITC\s*Limited|Hindustan\s*Unilever|Nestle|Britannia|Parle|Dabur|Godrej)[^\n\r]*",
            re.IGNORECASE,
        ),
    ]

    # Country of Origin Patterns
    ORIGIN_PATTERNS = [
        re.compile(
            r"(?:Country\s*of\s*Origin|Countryoforigin|Made\s*in|Product\s*of)\s*[:\-]?\s*([A-Za-z\s]+)",
            re.IGNORECASE,
        ),
    ]

    # Consumer Care / Contact Patterns (Noise-tolerant for 'Custome( Coje', landlines, emails, websites)
    CONSUMER_CARE_PATTERNS = [
        re.compile(
            r"(?:Custome[r\(\s]*C[ao][rej]e?|Consumer\s*Care|Customer\s*Care|Customer\s*Service|Helpline|Toll\s*Free|Feedback|In\s*case\s*of\s*complaint|Contact\s*Us)\s*[:\-]?\s*([^\n\r]+)",
            re.IGNORECASE,
        ),
        re.compile(
            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|0[0-9]{2,4}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}|[6-9][0-9]{9})\b",
            re.IGNORECASE,
        ),
    ]

    # Month & Year of Manufacture / Packing Patterns (Rule 6(1)(c))
    MFG_DATE_PATTERNS = [
        re.compile(
            r"(?:Mfg\.?\s*Date|Mfd\.?\s*Date|Date\s*of\s*Mfg|Date\s*of\s*Packing|Pkd\.?\s*Date|Packed\s*Date|Pkd\s*on|Mfg\s*on|Date\s*of\s*Import|Imported\s*on|MFG|MFD|MEG|PKD|PACKED|Pkd\.?|Mfd\.?)\s*[:\-\.\s]*([0-9]{1,2}[\/\-\.\s]+[0-9]{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\.\,\/\-]*[0-9]{2,4})",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(0[1-9]|1[0-2])[\/\-\.](20[2-3][0-9]|[2-3][0-9])\b"
        ),
    ]

    # Brand Patterns
    BRAND_PATTERNS = [
        re.compile(r"(?:Brand\s*Name|Brand)\s*[:\-]?\s*([^\n\r]+)", re.IGNORECASE),
        re.compile(r"\b(Figo|Camlin|Classmate|Apsara|Natraj|Doms|Reynolds|Cello|Parker|Faber\s*Castell|Dabur|Vanesa|Odonil|Ambi\s*Pur|Godrej|ITC|HUL)\b", re.IGNORECASE),
    ]

    # Product Name Patterns
    PRODUCT_NAME_PATTERNS = [
        re.compile(r"(?:Product\s*Name|Commodity|Item\s*Name)\s*[:\-]\s*([^\n\r]+)", re.IGNORECASE),
        re.compile(r"\b((?:[A-Za-z0-9]+\s+){0,2}(?:Air\s*Freshener|Lavender\s*Mist|Mist|Room\s*Freshener|Mechanical\s*Pencil|Pencil|Ball\s*Pen|Gel\s*Pen|Notebook|Eraser|Sharpener|Ruler|Water\s*Bottle|Tea|Coffee|Biscuits|Soap|Deodorant|Perfume|Spray))\b", re.IGNORECASE),
    ]

    # Noise phrases to strip from product name
    IGNORE_COMMODITY_PHRASES = [
        "usage manual", "how to use", "for best result", "to get the",
        "push on the", "to refill", "insert one", "press the", "table of lead",
        "a house of student needs", "house of student needs", "student needs",
        "hold upright", "spray in", "spray towards", "pressing", "results",
        "caution", "flammable", "puncture", "naked flame", "incandescent",
        "children", "contact", "rinse", "measure",
    ]


    @classmethod
    def extract_fields(cls, ocr_text: str) -> ExtractedProductData:
        """Extract structured label fields from raw OCR text with high fault tolerance."""
        if not ocr_text:
            return ExtractedProductData()

        lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
        
        mrp = cls._extract_mrp(ocr_text)
        net_qty, unit = cls._extract_net_quantity_and_unit(ocr_text)
        manufacturer = cls._extract_manufacturer(ocr_text)
        country_of_origin = cls._extract_origin(ocr_text)
        consumer_care = cls._extract_consumer_care(ocr_text)
        brand = cls._extract_brand(ocr_text, lines)
        product_name = cls._extract_product_name(ocr_text, lines, brand)
        mfg_date = cls._extract_mfg_date(ocr_text)

        return ExtractedProductData(
            product_name=product_name,
            brand=brand,
            manufacturer=manufacturer,
            mrp=mrp,
            net_quantity=net_qty,
            unit=unit,
            country_of_origin=country_of_origin,
            consumer_care=consumer_care,
            mfg_date=mfg_date,
        )

    @classmethod
    def _extract_regex(cls, text: str, patterns: list) -> Optional[str]:
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                val = match.group(1 if pattern.groups >= 1 else 0).strip(" :-,.")
                if val:
                    return val
        return None

    @classmethod
    def _extract_mrp(cls, text: str) -> Optional[str]:
        candidates: List[Tuple[float, str]] = []
        for idx, pattern in enumerate(cls.MRP_PATTERNS):
            for match in pattern.finditer(text):
                raw_price = match.group(1 if pattern.groups >= 1 else 0).replace(",", "").strip(" ./-")
                if raw_price.isdigit() and 2000 <= int(raw_price) <= 2050: # Likely a year
                    continue
                try:
                    price_val = float(raw_price)
                    # FMCG products typically don't cost > 20000. Filters out pin codes (e.g. 173030)
                    if 1.0 <= price_val <= 20000:
                        score = 100 - idx * 10
                        if "/-" in match.group(0):
                            score += 20
                        if any(s in match.group(0).lower() for s in ["rs", "mrp", "₹"]):
                            score += 30
                        candidates.append((score, f"₹{raw_price}" if not raw_price.startswith("₹") else raw_price))
                except ValueError:
                    continue

        if candidates:
            # Pick highest scored candidate
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]
        return None

    @classmethod
    def _extract_net_quantity_and_unit(cls, text: str) -> Tuple[Optional[str], Optional[str]]:
        unit_map = {
            "gm": "g",
            "grams": "g",
            "gram": "g",
            "kgs": "kg",
            "kilogram": "kg",
            "ltr": "l",
            "litre": "l",
            "litres": "l",
            "pcs": "N",
            "piece": "N",
            "pieces": "N",
            "count": "N",
            "u": "U",
            "n": "N",
            "units": "N",
            "lead": "N",
            "lead tube": "N",
            "lead tubes": "N",
            "pencil": "N",
            "pencils": "N",
            "pens": "N",
            "pen": "N",
            "refill": "N",
            "refills": "N",
        }

        for pattern in cls.NET_QTY_PATTERNS:
            match = pattern.search(text)
            if match:
                qty = match.group(1).strip()
                unit = match.group(2).strip().lower()
                standard_unit = unit_map.get(unit, unit)
                return qty, standard_unit

        # Check if text contains "Contains ... 1" or package contents
        contains_match = re.search(r"Contains\s*[:\-]?\s*([^\n\r]+)", text, re.IGNORECASE)
        if contains_match:
            c_text = contains_match.group(1)
            num_match = re.search(r"\b(\d+)\b", c_text)
            if num_match:
                return num_match.group(1), "N"

        return None, None

    @classmethod
    def _extract_manufacturer(cls, text: str) -> Optional[str]:
        # Prioritize prominent branding/company declaration
        quality_from = re.search(r"(?:A\s*Quality\s*product\s*from|Manufactured\s*by|Packed\s*by|Mfg\.?\s*by|Mfd\.?\s*by|Marketed\s*by)\s*[:\-]?\s*([A-Za-z0-9\s,\-\#]+?(?:Tamil\s*Nadu|Delhi|Maharashtra|Karnataka|Gujarat|India|\d{6}|\bIMPEX\b|\bLTD\b|\bPVT\b|\bLIMITED\b|\bCORP\b))", text, re.IGNORECASE)
        if quality_from:
            return quality_from.group(1).strip(" .,-")

        # Try standard prefix matches
        val = cls._extract_regex(text, cls.MFG_PATTERNS)
        if val:
            cleaned = val.split("\n")[0].strip(" .,-")
            if len(cleaned) > 2:
                # Strip leading or trailing noise
                cleaned = re.sub(r"\s*(?:Contains|MRP|Pkd|Made\s*in).*$", "", cleaned, flags=re.IGNORECASE).strip(" .,-")
                if len(cleaned) > 2:
                    return cleaned
        return None

    @classmethod
    def _extract_origin(cls, text: str) -> Optional[str]:
        if re.search(r"\bMADE\s*IN\s*INDIA\b", text, re.IGNORECASE):
            return "India"
        val = cls._extract_regex(text, cls.ORIGIN_PATTERNS)
        if val:
            val = val.split("\n")[0].strip(" .,-")
            # Strip trailing tokens like 'Contains', 'MRP', etc.
            val = re.sub(r"\s*(?:Contains|MRP|Pkd|Net|Mfg|Date|Batch).*$", "", val, flags=re.IGNORECASE).strip(" .,-")
            return val
        return None

    @classmethod
    def _extract_consumer_care(cls, text: str) -> Optional[str]:
        contacts: List[str] = []

        # Find phone numbers / customer care line
        phone_match = re.search(r"(?:Custome[r\(\s]*C[ao][rej]e?|Helpline|Care)\s*[:\-]?\s*([0-9\-\s]{6,15})", text, re.IGNORECASE)
        if phone_match:
            contacts.append(f"Tel: {phone_match.group(1).strip()}")
        else:
            std_phone = re.search(r"\b0[0-9]{2,4}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}\b", text)
            if std_phone:
                contacts.append(f"Tel: {std_phone.group(0)}")

        # Find emails (tolerant of OCR inserted spaces around @)
        email_match = re.search(r"([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", text)
        if email_match:
            contacts.append(f"{email_match.group(1)}@{email_match.group(2)}")

        # Find website
        web_match = re.search(r"(?:www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text, re.IGNORECASE)
        if web_match and not email_match:
            contacts.append(web_match.group(0))

        if contacts:
            return " | ".join(contacts)

        # Fallback to direct pattern match
        for pattern in cls.CONSUMER_CARE_PATTERNS:
            match = pattern.search(text)
            if match:
                val = match.group(1 if pattern.groups >= 1 else 0).strip(" :-,.")
                if len(val) > 4:
                    return val

        return None

    @classmethod
    def _extract_brand(cls, text: str, lines: list) -> Optional[str]:
        val = cls._extract_regex(text, cls.BRAND_PATTERNS)
        if val:
            return val
        # Check known brands in whole text
        known_brand = re.search(r"\b(Figo|Camlin|Classmate|Apsara|Natraj|Doms|Reynolds|Cello|Parker|Faber\s*Castell|Dabur|Vanesa|Odonil|Ambi\s*Pur|Godrej|ITC|HUL)\b", text, re.IGNORECASE)
        if known_brand:
            return known_brand.group(1).capitalize()

        if lines and len(lines) > 0 and len(lines[0]) < 30 and not any(kw in lines[0].lower() for kw in ["mrp", "net", "mfd", "pkg", "usage", "measure", "caution", "direction", "of children"]):
            if not lines[0].lower().startswith("product") and not lines[0].lower().startswith("ingredient"):
                return lines[0].strip()
        return None

    @classmethod
    def _extract_product_name(cls, text: str, lines: list, brand: Optional[str] = None) -> Optional[str]:

        val = cls._extract_regex(text, cls.PRODUCT_NAME_PATTERNS)
        if val:
            cleaned = re.sub(r"^(?:P[r|e]oduct\s*(?:Name)?|Commodity|Item\s*(?:Name)?)\s*[:\-]?\s*", "", val, flags=re.IGNORECASE).strip()
            if not any(ign in cleaned.lower() for ign in cls.IGNORE_COMMODITY_PHRASES):
                return cleaned if cleaned else val

        if lines:
            for line in lines[:5]:
                cleaned_line = line.strip()
                if any(ign in cleaned_line.lower() for ign in cls.IGNORE_COMMODITY_PHRASES):
                    continue
                if not any(kw in cleaned_line.lower() for kw in ["mrp", "net", "mfd", "tel", "email", "care", "brand", "rs."]):
                    cleaned = re.sub(r"^(?:P[r|e]oduct\s*(?:Name)?|Commodity|Item\s*(?:Name)?)\s*[:\-]?\s*", "", cleaned_line, flags=re.IGNORECASE).strip()
                    if len(cleaned) > 2:
                        return cleaned
        return None

    @classmethod
    def _extract_mfg_date(cls, text: str) -> Optional[str]:
        # Direct regex search
        for pattern in cls.MFG_DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                val = match.group(1).strip(" :-,.")
                # Clean dot matrix spaces (e.g. "05 / 2025" -> "05/2025")
                val = re.sub(r"\s*[\/\-\.]\s*", "/", val)
                if len(val) >= 4:
                    return val

        # Dot-matrix fuzzy translation for characters confused in inkjet print (e.g., OS/202S -> 05/2025)
        fuzzy_date_pattern = re.compile(r"\b([0-9OoSsIlZz]{1,2})[\/\-\.\s]+([0-9OoSsIlZz]{2,4})\b")
        table = str.maketrans({"O": "0", "o": "0", "S": "5", "s": "5", "I": "1", "l": "1", "Z": "2", "z": "2", "B": "8"})
        for m in fuzzy_date_pattern.finditer(text):
            m_str, y_str = m.group(1), m.group(2)
            m_clean = m_str.translate(table)
            y_clean = y_str.translate(table)
            if m_clean.isdigit() and y_clean.isdigit():
                m_val, y_val = int(m_clean), int(y_clean)
                if 1 <= m_val <= 12 and (2020 <= y_val <= 2035 or 20 <= y_val <= 35):
                    if y_val < 100:
                        y_val += 2000
                    return f"{m_val:02d}/{y_val}"

        return None

