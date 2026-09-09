import os
import io
import logging
from PIL import Image
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class YOLOService:
    def __init__(self):
        self.mrp_model = None
        # Path expects mrp_yolo11.pt to be in the BACKEND root folder
        mrp_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "mrp_yolo11.pt")
        
        try:
            if os.path.exists(mrp_path):
                self.mrp_model = YOLO(mrp_path)
                logger.info(f"YOLO11 MRP model loaded from {mrp_path}")
            else:
                logger.warning(f"YOLO11 MRP model not found at {mrp_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO11 model: {e}")

    def crop_mrp_panel(self, image_bytes: bytes) -> bytes:
        if not self.mrp_model:
            return image_bytes

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            results = self.mrp_model(image)
            
            if len(results) > 0 and len(results[0].boxes) > 0:
                
                # Find the class ID for 'mrp' in this specific model
                mrp_class_id = None
                for cls_id, cls_name in results[0].names.items():
                    if cls_name.lower() == "mrp":
                        mrp_class_id = float(cls_id)
                        break

                boxes = results[0].boxes
                best_box = None
                best_conf = 0.0
                
                for box in boxes:
                    # If we found the 'mrp' class ID, skip any boxes that aren't MRP
                    if mrp_class_id is not None and float(box.cls[0]) != mrp_class_id:
                        continue
                        
                    conf = float(box.conf[0])
                    if conf > best_conf:
                        best_conf = conf
                        best_box = box
                
                if best_box and best_conf > 0.4:
                    x1, y1, x2, y2 = best_box.xyxy[0].tolist()
                    
                    # Expand the crop slightly to ensure text isn't cut off (15px padding)
                    padding = 15
                    width, height = image.size
                    x1 = max(0, int(x1) - padding)
                    y1 = max(0, int(y1) - padding)
                    x2 = min(width, int(x2) + padding)
                    y2 = min(height, int(y2) + padding)
                    
                    cropped_image = image.crop((x1, y1, x2, y2))
                    logger.info(f"YOLO11 successfully cropped MRP panel. Conf: {best_conf:.2f}")
                    
                    buf = io.BytesIO()
                    cropped_image.save(buf, format='PNG')
                    return buf.getvalue()
            
            logger.info("YOLO11 did not detect any MRP panel above threshold. Falling back to full image.")
            return image_bytes
            
        except Exception as e:
            logger.error(f"Error during YOLO11 cropping: {e}")
            return image_bytes

# Singleton instance
yolo_service = YOLOService()
