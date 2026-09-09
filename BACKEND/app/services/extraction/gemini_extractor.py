import os
import json
import logging
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv
from app.schemas.inspection import ExtractedProductData

logger = logging.getLogger(__name__)

# Ensure .env is loaded before grabbing the key
load_dotenv()

class GeminiExtractor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Using 1.5-flash as it is highly capable and fast for multimodal structured output
            self.model = genai.GenerativeModel("gemini-3.5-flash")
            self.enabled = True
            logger.info("Gemini AI Extractor initialized successfully.")
        else:
            self.enabled = False
            logger.warning("GEMINI_API_KEY not found in environment variables. Gemini Extractor is disabled.")

    def extract_from_image(self, image_bytes: bytes) -> ExtractedProductData:
        if not self.enabled:
            logger.error("Attempted to use GeminiExtractor but it is disabled.")
            return ExtractedProductData()
            
        try:
            logger.info("Sending image to Gemini AI for Dynamic Structured Output extraction...")
            image = Image.open(io.BytesIO(image_bytes))
            
            prompt = """
            You are a highly accurate Legal Metrology compliance assistant. 
            Analyze this product packaging image and extract the following details as a JSON object:
            - product_name (string or null)
            - brand (string or null)
            - manufacturer (string or null)
            - mrp (string or null)
            - net_quantity (string or null)
            - unit (string or null)
            - country_of_origin (string or null)
            - consumer_care (string or null)
            - mfg_date (string or null)
            - batch_number (string or null)
            
            Rules for Extraction:
            1. mrp: If found, always prefix with 'Rs. ' (e.g., 'Rs. 149.00'). Look closely for 'MRP', 'Max Retail Price', or price values followed by '/-'.
            2. unit: Normalize all units to standard metric abbreviations (e.g., 'g', 'kg', 'ml', 'l').
            3. net_quantity: Only extract the numeric value. Separate the number from the unit.
            4. mfg_date: Normalize to Month/Year format (e.g., '10/2023' or 'Oct 2023').
            5. manufacturer: Include the full name and address if available.
            6. batch_number: Look for 'B.NO', 'Batch No.', 'Lot No.', or 'B.No:' and extract the alphanumeric string (e.g., '34').
            
            If a field is completely missing or illegible, return null. Output MUST be valid JSON only.
            """
            
            # We rely on the strong prompt and JSON mime type since passing the Pydantic schema directly 
            # triggered an SDK bug with default fields.
            response = self.model.generate_content(
                [prompt, image],
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            if response.text:
                data = json.loads(response.text)
                logger.info(f"Gemini Structured Output: {data}")
                return ExtractedProductData(**data)
            else:
                logger.warning("Gemini returned an empty response.")
                return ExtractedProductData()
                
        except Exception as e:
            logger.error(f"Error extracting data with Gemini: {e}")
            return ExtractedProductData()

# Singleton instance
gemini_extractor = GeminiExtractor()
