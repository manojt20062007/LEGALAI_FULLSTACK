import io
import asyncio
import logging
from typing import Union, List, Dict, Any
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter  # Fix: ImageFilter was missing

import winocr
from app.services.ocr.base import OCRService, OCRResult

logger = logging.getLogger(__name__)

# Optional: OpenCV for advanced preprocessing
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    logger.info("opencv-python not available. Advanced OCR preprocessing disabled.")


class WindowsNativeOCRAdapter(OCRService):
    """
    Real OCR Adapter powered by Windows Native Optical Character Recognition engine (winocr).
    Provides accurate, fast, hardware-accelerated text extraction from real product packages.

    Enhanced pipeline for camera-captured photos:
      1. EXIF auto-orient
      2. Shadow/glare normalization (uneven lighting from camera flash)
      3. Deskew correction (correct label tilt)
      4. Super-resolution upscaling for small images
      5. Adaptive threshold binarization (better than simple contrast for colored labels)
      6. 3-pass OCR: RGB enhanced → Morphological (dot-matrix) → Inverted (dark labels)
      7. De-duplicate and fuse all passes
    """

    def __init__(self, lang: str = "en"):
        self.lang = lang

    # ------------------------------------------------------------------
    # Image Preprocessing
    # ------------------------------------------------------------------

    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        """Basic PIL preprocessing: EXIF orient, contrast, sharpness."""
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        if img.mode != "RGB":
            img = img.convert("RGB")

        # Upscale small images — phone camera label crops can be small
        w, h = img.size
        if max(w, h) < 1200:
            scale = 1200 / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        # Resize if overly large
        if max(img.size) > 3000:
            img.thumbnail((3000, 3000), Image.Resampling.LANCZOS)

        try:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.30)
            sharpener = ImageEnhance.Sharpness(img)
            img = sharpener.enhance(1.25)
        except Exception as e:
            logger.debug(f"PIL enhancement skipped: {e}")

        return img

    def _advanced_preprocess(self, img: Image.Image) -> Image.Image:
        """
        Advanced OpenCV preprocessing pipeline for camera-captured product labels.
        Handles: uneven lighting, skewed labels, colored backgrounds, dot-matrix print.
        """
        if not HAS_CV2:
            return img

        try:
            img_np = np.array(img)
            bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

            # 1. Shadow/Glare removal via CLAHE (Contrast Limited Adaptive Histogram Equalization)
            # Works on each channel in LAB space - preserves colors while equalizing brightness
            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            l_ch = clahe.apply(l_ch)
            lab = cv2.merge((l_ch, a_ch, b_ch))
            bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

            # 2. Noise reduction - remove JPEG artifacts without blurring text
            bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 7, 7, 7, 21)

            # 3. Deskew correction - detect label tilt and rotate
            bgr = self._deskew(bgr)

            result = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            return Image.fromarray(result)

        except Exception as e:
            logger.debug(f"Advanced preprocessing skipped: {e}")
            return img

    def _deskew(self, img_bgr) -> "np.ndarray":
        """
        Detect and correct label/image skew using Hough line transform.
        Corrects up to ±15 degrees of rotation from camera angle.
        """
        if not HAS_CV2:
            return img_bgr
        try:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

            # Find lines using probabilistic Hough transform
            lines = cv2.HoughLinesP(binary, 1, np.pi / 180, threshold=80,
                                    minLineLength=img_bgr.shape[1] // 4,
                                    maxLineGap=20)
            if lines is None:
                return img_bgr

            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                # Only consider near-horizontal lines (text lines)
                if -15 <= angle <= 15:
                    angles.append(angle)

            if not angles:
                return img_bgr

            # Use median angle to avoid outlier influence
            median_angle = float(np.median(angles))
            if abs(median_angle) < 0.5:
                return img_bgr  # Negligible skew, skip

            h, w = img_bgr.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(img_bgr, M, (w, h),
                                     flags=cv2.INTER_CUBIC,
                                     borderMode=cv2.BORDER_REPLICATE)
            logger.debug(f"Deskewed image by {median_angle:.2f} degrees")
            return rotated

        except Exception as e:
            logger.debug(f"Deskew skipped: {e}")
            return img_bgr

    def _make_binarized(self, img: Image.Image) -> Image.Image:
        """
        Adaptive threshold binarization — much better than simple grayscale
        for labels with colored backgrounds, gradients, or uneven lighting.
        """
        if not HAS_CV2:
            # PIL fallback: convert to grayscale
            return img.convert("L")

        try:
            img_np = np.array(img)
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            # Adaptive threshold: handles different lighting regions across the label
            binary = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=15,
                C=8
            )
            # Light morphological opening to connect broken characters
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
            return Image.fromarray(binary)
        except Exception as e:
            logger.debug(f"Binarization skipped: {e}")
            return img.convert("L")

    def _make_morphological(self, img: Image.Image) -> Image.Image:
        """
        Morphological MinFilter — connects dots in dot-matrix / inkjet MRP prints.
        Critical for reading MFG dates and MRP on inkjet-printed labels.
        """
        try:
            gray = img.convert("L")
            morph = gray.filter(ImageFilter.MinFilter(3))
            return morph
        except Exception as e:
            logger.debug(f"Morphological pass skipped: {e}")
            return img

    def _make_inverted(self, img: Image.Image) -> Image.Image:
        """
        Inverted image — for dark-background / metallic labels where text is white/light.
        """
        try:
            gray = img.convert("L")
            return ImageOps.invert(gray)
        except Exception as e:
            logger.debug(f"Invert pass skipped: {e}")
            return img

    # ------------------------------------------------------------------
    # OCR Execution (async wrapper, thread-safe)
    # ------------------------------------------------------------------

    def _run_winocr(self, pil_image: Image.Image) -> Any:
        """Run winocr synchronously, handling both running and non-running event loops."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(asyncio.run, winocr.recognize_pil(pil_image, lang=self.lang))
                    return future.result(timeout=30)
            else:
                return loop.run_until_complete(winocr.recognize_pil(pil_image, lang=self.lang))
        except RuntimeError:
            return asyncio.run(winocr.recognize_pil(pil_image, lang=self.lang))

    def _collect_lines_and_detections(self, ocr_result, base_confidence: float = 0.95):
        """Extract line texts and word-level bounding boxes from winocr result."""
        lines_text = []
        detections = []
        if not ocr_result or not ocr_result.lines:
            return lines_text, detections
        for line in ocr_result.lines:
            lines_text.append(line.text)
            for word in line.words:
                rect = word.bounding_rect
                detections.append({
                    "text": word.text,
                    "box": [
                        [rect.x, rect.y],
                        [rect.x + rect.width, rect.y],
                        [rect.x + rect.width, rect.y + rect.height],
                        [rect.x, rect.y + rect.height],
                    ],
                    "confidence": base_confidence,
                })
        return lines_text, detections

    # ------------------------------------------------------------------
    # Orientation Detection
    # ------------------------------------------------------------------

    def _detect_best_orientation(self, img: Image.Image) -> int:
        """
        Run a quick pass of winocr on 4 rotations of a downscaled version of the image
        to determine the correct text orientation. Returns the angle (0, 90, 180, 270)
        that yields the most extracted characters.
        """
        w, h = img.size
        # Downscale for speed (max 800px on longest side)
        scale = min(1.0, 800 / max(w, h))
        test_img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        
        best_angle = 0
        max_chars = -1
        
        for angle in (0, 90, 180, 270):
            # PIL rotate is counter-clockwise. expand=True keeps image bounds.
            rotated = test_img.rotate(angle, expand=True) if angle != 0 else test_img
            try:
                res = self._run_winocr(rotated)
                char_count = sum(len(line.text.replace(" ", "")) for line in res.lines) if res and res.lines else 0
                if char_count > max_chars:
                    max_chars = char_count
                    best_angle = angle
            except Exception as e:
                logger.debug(f"Orientation {angle} failed: {e}")
                
        logger.info(f"Auto-detected best orientation: {best_angle} degrees with {max_chars} chars")
        return best_angle

    # ------------------------------------------------------------------
    # Main Entry Point
    # ------------------------------------------------------------------

    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        try:
            # Load image
            if isinstance(image_data, (str, Path)):
                img = Image.open(str(image_data))
            elif isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                img = image_data
            else:
                raise ValueError("Unsupported image input type for WindowsNativeOCRAdapter")

            # ---- Stage 1: Basic preprocessing (EXIF, upscale, contrast) ----
            img = self._preprocess_image(img)

            # ---- Stage 1.5: Multi-rotation text orientation detection ----
            best_angle = self._detect_best_orientation(img)
            if best_angle != 0:
                img = img.rotate(best_angle, expand=True)

            # ---- Stage 2: Advanced CV preprocessing (deskew, shadow removal) ----
            img_advanced = self._advanced_preprocess(img)

            # ---- 3-Pass OCR ----
            all_lines: List[str] = []
            all_detections: List[Dict[str, Any]] = []

            # Pass 1: Standard contrast-enhanced RGB (best for clear color labels)
            try:
                result1 = self._run_winocr(img_advanced)
                lines1, dets1 = self._collect_lines_and_detections(result1, 0.95)
                all_lines.extend(lines1)
                all_detections.extend(dets1)
                logger.debug(f"OCR Pass 1 (RGB enhanced): {len(lines1)} lines")
            except Exception as e:
                logger.warning(f"OCR Pass 1 failed: {e}")
                result1 = None

            # Pass 2: Adaptive binarized (better for dark/colored backgrounds and dense text)
            try:
                img_bin = self._make_binarized(img_advanced)
                result2 = self._run_winocr(img_bin)
                lines2, dets2 = self._collect_lines_and_detections(result2, 0.92)
                # Only add lines not already captured
                for line in lines2:
                    t = line.strip()
                    if t and not any(t.lower() in existing.lower() for existing in all_lines):
                        all_lines.append(t)
                        logger.debug(f"Pass 2 added new line: {t[:50]}")
                all_detections.extend(dets2)
            except Exception as e:
                logger.warning(f"OCR Pass 2 (binarized) failed: {e}")

            # Pass 3: Morphological + MinFilter (for inkjet/dot-matrix MFG dates & MRP)
            try:
                img_morph = self._make_morphological(img_advanced)
                result3 = self._run_winocr(img_morph)
                lines3, dets3 = self._collect_lines_and_detections(result3, 0.88)
                for line in lines3:
                    t = line.strip()
                    if t and not any(t.lower() in existing.lower() for existing in all_lines):
                        all_lines.append(t)
                        logger.debug(f"Pass 3 added new line: {t[:50]}")
                all_detections.extend(dets3)
            except Exception as e:
                logger.warning(f"OCR Pass 3 (morphological) failed: {e}")

            # Pass 4: Inverted — only if we have dark-background label indication
            # (triggered when primary OCR gives very few lines)
            if len(all_lines) < 5:
                try:
                    img_inv = self._make_inverted(img_advanced)
                    result4 = self._run_winocr(img_inv)
                    lines4, dets4 = self._collect_lines_and_detections(result4, 0.80)
                    for line in lines4:
                        t = line.strip()
                        if t and not any(t.lower() in existing.lower() for existing in all_lines):
                            all_lines.append(t)
                    all_detections.extend(dets4)
                    logger.debug(f"OCR Pass 4 (inverted, dark label): {len(lines4)} lines")
                except Exception as e:
                    logger.warning(f"OCR Pass 4 (inverted) failed: {e}")

            # ---- Assemble final output ----
            if not all_lines and result1:
                all_lines = [result1.text] if result1.text else []

            full_text = "\n".join(all_lines)

            # Confidence: based on total meaningful characters extracted
            char_count = len(full_text.replace(" ", "").replace("\n", ""))
            if char_count > 100:
                confidence = 0.95
            elif char_count > 40:
                confidence = 0.85
            elif char_count > 10:
                confidence = 0.70
            else:
                confidence = 0.40

            logger.info(
                f"Windows Native OCR: {len(all_lines)} lines, {char_count} chars, "
                f"confidence={confidence:.2f}, deskew={'on' if HAS_CV2 else 'off'}"
            )

            return OCRResult(
                text=full_text,
                confidence=confidence,
                raw_detections=all_detections,
            )

        except Exception as e:
            logger.error(f"WindowsNativeOCRAdapter failed: {e}", exc_info=True)
            return OCRResult(text="", confidence=0.30, raw_detections=[])
