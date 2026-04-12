"""
DoclingService (IBM) - Docling Agent v4
L'outil « Géant » par excellence (IBM Research).
Utilise le modèle unifié Granite-Docling pour transformer des photos en documents structurés (Markdown/JSON/PDF).
Remplace avantageusement Tesseract et les pipelines multi-étapes.
"""

import logging
import asyncio
from typing import Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import DocumentComponents, PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

logger = logging.getLogger(__name__)

class DoclingService:
    _instance = None
    _executor = ThreadPoolExecutor(max_workers=4)

    @classmethod
    def get_instance(cls) -> "DoclingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        """
        Initialise le convertisseur Docling d'IBM.
        Configure le pipeline pour la reconnaissance haute-fidélité des scans mobiles.
        """
        try:
            # Options du pipeline : on active l'OCR haute-fidélité pour les images
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True
            pipeline_options.do_table_structure = True # Idéal pour les tableaux de prix BTP
            
            self.converter = DocumentConverter(
                pipeline_options=pipeline_options
            )
            logger.info("✅ Docling Engine (IBM Giant) initialisé (Granite-Docling Ready)")
        except Exception as e:
            logger.error("❌ Échec initialisation Docling (IBM) : %s", e)
            self.converter = None

    async def convert_photo_to_markdown_async(self, file_path: str) -> Optional[str]:
        """Convertit une photo ou un PDF en Markdown structuré."""
        if not self.converter:
            return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor, 
            self._convert_sync, 
            file_path
        )

    def _convert_sync(self, file_path: str) -> Optional[str]:
        """Traitement synchrone par le moteur IBM."""
        try:
            result = self.converter.convert(file_path)
            # On exporte en Markdown pour Gemini (format ultra-léger et structuré)
            markdown_content = result.document.export_to_markdown()
            
            logger.info("Docling success: document converti [%s]", file_path)
            return markdown_content
        except Exception as e:
            logger.error("Erreur moteur Docling (IBM) : %s", e)
            return None

    @staticmethod
    def is_available() -> bool:
        try:
            import docling
            return True
        except ImportError:
            return False
