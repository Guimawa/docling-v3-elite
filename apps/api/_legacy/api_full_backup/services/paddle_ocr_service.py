"""
PaddleOCRService - Docling Agent v4
L'alternative « Géante » (Baidu) pour l'OCR haute-fidélité.
Technologie : PaddleOCR v4 (PP-OCRv4) avec détection DB + reconnaissance SVTR.
Plus robuste que Tesseract face au bruit et aux documents froissés.
"""

import logging
import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import cv2
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)

class PaddleOCRService:
    _instance = None
    _executor = ThreadPoolExecutor(max_workers=2)

    @classmethod
    def get_instance(cls) -> "PaddleOCRService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self, lang: str = "fr"):
        """
        Initialise le moteur PaddleOCR.
        Remarque : Le premier appel téléchargera les modèles (~100 Mo).
        """
        try:
            # use_angle_cls=True : détecte l'orientation du texte (très utile pour les scans mobiles)
            # lang="fr" : supporte les caractères accentués
            # show_log=False : évite le spam dans les logs
            self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
            logger.info("✅ PaddleOCR (Giant Engine) initialisé [lang=%s]", lang)
        except Exception as e:
            logger.error("❌ Échec initialisation PaddleOCR : %s", e)
            self.ocr = None

    async def ocr_from_bytes_async(self, image_bytes: bytes) -> str:
        """Exécution asynchrone pour ne pas bloquer l'event loop FastAPI."""
        if not self.ocr:
            return ""
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor, 
            self._ocr_sync, 
            image_bytes
        )

    def _ocr_sync(self, image_bytes: bytes) -> str:
        """Traitement synchrone via OpenCV + PaddleOCR."""
        try:
            # Décoder l'image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return ""

            # Exécution OCR
            # result est une liste de [box, (text, confidence)]
            result = self.ocr.ocr(img, cls=True)
            
            if not result or not result[0]:
                return ""

            # Extraction et concaténation du texte
            full_text = []
            for line in result[0]:
                text = line[1][0]
                conf = line[1][1]
                if conf > 0.4: # Filtre de confiance minimum
                    full_text.append(text)

            logger.info("PaddleOCR success: %d lignes extraites", len(full_text))
            return "\n".join(full_text)

        except Exception as e:
            logger.error("Erreur PaddleOCR : %s", e)
            return ""

    @staticmethod
    def is_available() -> bool:
        try:
            import paddleocr
            return True
        except ImportError:
            return False
