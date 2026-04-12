"""
Image Preprocessor — Docling Agent v3
Nettoyage et optimisation des photos mobiles avant envoi à Gemini.
Pipeline : débruitage → contraste CLAHE → redressement → WebP
"""

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    @staticmethod
    def preprocess_bytes(image_bytes: bytes, filename: str = "image", force_warp: bool = False) -> bytes:
        """
        Prend des bytes d'image, applique le redressement de perspective (Adobe Scan style)
        puis le pipeline de nettoyage. Retourne des bytes WebP optimisés.
        """
        try:
            # Décoder l'image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                logger.warning("Impossible de décoder le fichier image, retour image brute")
                return image_bytes

            # ── 1. Redimensionner si extrêmement grand (pour perf détection) ────
            h, w = img.shape[:2]
            max_dim = 2500
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(
                    img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
                )

            # ── 2. Redressement de perspective (Perspective Warp) ──────────────
            orig = img.copy()
            corners = ImagePreprocessor._get_document_corners(img)

            if corners is not None:
                img = ImagePreprocessor._four_point_transform(orig, corners.reshape(4, 2))
                logger.debug("✅ Redressement de perspective appliqué [%s]", filename)
            else:
                logger.debug("⚠️ Aucun contour de document détecté, nettoyage sans redressement")

            # ── 3. Débruitage léger (préserve les textes fins) ────
            img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)

            # ── 4. Contraste CLAHE sur canal L (Lab) ──────────────
            # Améliore la lisibilité sans saturer les couleurs
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l_ch, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_ch = clahe.apply(l_ch)
            img = cv2.cvtColor(cv2.merge([l_ch, a, b]), cv2.COLOR_LAB2BGR)

            # ── 5. Légère netteté (unsharp mask) ──────────────────
            gaussian = cv2.GaussianBlur(img, (0, 0), 2.0)
            img = cv2.addWeighted(img, 1.4, gaussian, -0.4, 0)

            # ── 6. Encoder en WebP qualité 90 (format standard 2026) ─────────────
            success, buffer = cv2.imencode(".webp", img, [cv2.IMWRITE_WEBP_QUALITY, 90])
            if not success:
                return image_bytes

            logger.info(
                "✅ Prétraitement OK (v4): %dKo → %dKo",
                len(image_bytes) // 1024,
                len(buffer) // 1024,
            )
            return buffer.tobytes()

        except Exception as e:
            logger.error("Erreur prétraitement image v4: %s", type(e).__name__)
            return image_bytes

    @staticmethod
    def _get_document_corners(img):
        """Détecte les 4 coins d'une feuille de papier dans l'image."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        # Canny pour détecter les bords
        edged = cv2.Canny(blur, 75, 200)

        # Trouver les contours
        cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]

        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            # On cherche un contour avec 4 points
            if len(approx) == 4:
                return approx
        return None

    @staticmethod
    def _four_point_transform(image, pts):
        """Applique la transformation de perspective sur les 4 points détectés."""
        rect = ImagePreprocessor._order_points(pts)
        (tl, tr, br, bl) = rect

        # Calculer la largeur de la nouvelle image
        width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_a), int(width_b))

        # Calculer la hauteur de la nouvelle image
        height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_a), int(height_b))

        dst = np.array(
            [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
            dtype="float32",
        )

        # Matrice de transformation
        m = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, m, (max_width, max_height))
        return warped

    @staticmethod
    def _order_points(pts):
        """Ordonne les points : haut-gauche, haut-droite, bas-droite, bas-gauche."""
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect

    @staticmethod
    def is_image(filename: str) -> bool:
        return Path(filename).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
