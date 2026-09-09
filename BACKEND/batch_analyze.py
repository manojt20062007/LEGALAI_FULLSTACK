import os
import sys
import glob
import logging
from pathlib import Path

# Add backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ocr import get_ocr_service
from app.services.extraction.extractor import LabelExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_folder(folder_path):
    ocr_service = get_ocr_service()
    image_files = glob.glob(os.path.join(folder_path, "*.jpeg")) + glob.glob(os.path.join(folder_path, "*.jpg"))
    
    logger.info(f"Found {len(image_files)} images in {folder_path}. Starting analysis...")
    
    results = []
    
    for i, img_path in enumerate(image_files, 1):
        filename = os.path.basename(img_path)
        logger.info(f"[{i}/{len(image_files)}] Processing {filename}...")
        
        try:
            # 1. OCR
            ocr_result = ocr_service.extract_text(img_path)
            
            # 2. Extract Fields
            fields = LabelExtractor.extract_fields(ocr_result.text)
            
            results.append({
                "File": filename,
                "Confidence": f"{ocr_result.confidence*100:.1f}%",
                "Product": fields.product_name,
                "Brand": fields.brand,
                "MRP": fields.mrp,
                "NetQty": fields.net_quantity,
                "Date": fields.mfg_date
            })
        except Exception as e:
            logger.error(f"Error processing {filename}: {e}")
            
    # Write Markdown Table to file to avoid Windows console unicode errors
    output_file = os.path.join(folder_path, "analysis_results.md")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("# Batch Analysis Results\n\n")
        f.write("| File | Conf | Product | Brand | MRP | NetQty | Date |\n")
        f.write("|------|------|---------|-------|-----|--------|------|\n")
        for r in results:
            f.write(f"| {r['File'][:15]}... | {r['Confidence']} | {str(r['Product'])[:15]} | {str(r['Brand'])[:10]} | {r['MRP']} | {r['NetQty']} | {r['Date']} |\n")
            
    logger.info(f"Analysis complete! Results saved to {output_file}")
        
if __name__ == "__main__":
    analyze_folder(r"E:\LEGALAI\images")
