from typing import Annotated, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

# Liste des familles de produits BTP (Standard 2026)
BTDFamille = Literal[
    "Armature",
    "Cloison",
    "Climatisation",
    "Plomberie",
    "Électricité",
    "Menuiserie",
    "Couverture",
    "Carrelage",
    "Isolation",
    "Peinture",
    "Outillage",
    "Consommable",
    "Maçonnerie",
    "Terrassement",
    "Autre",
]

# Types contraints pour performance Rust (Pydantic-core)
PositiveFloat = Annotated[float, Field(ge=0)]
PercentFloat = Annotated[float, Field(ge=0, le=100)]
NonEmptyStr = Annotated[str, Field(min_length=1)]

# Aligné avec la contrainte « max 80 car. » du prompt Gemini
DESIGNATION_FR_MAX_LEN = 80


class Product(BaseModel):
    """Représente un produit/article extrait d'une facture."""

    model_config = ConfigDict(frozen=True, from_attributes=True, strict=True)

    fournisseur: NonEmptyStr
    designation_raw: NonEmptyStr
    designation_fr: NonEmptyStr
    famille: BTDFamille = "Autre"
    unite: str = "unité"

    # PU HT catalogue avant remise (ex. colonne Preu)
    prix_brut_ht: PositiveFloat = 0.0
    remise_pct: PercentFloat = 0.0

    # PU HT après remise (dérivé ou sur document)
    prix_remise_ht: PositiveFloat = 0.0

    # PU TTC (après remise et taxes)
    prix_ttc_remise: PositiveFloat = 0.0
    prix_ttc_non_remise: PositiveFloat = 0.0

    # Rétrocompatibilité / Exports métiers
    prix_ttc_iva21: PositiveFloat = 0.0

    numero_facture: str | None = None
    date_facture: str | None = None
    confidence: Literal["high", "low"] = "high"

    # Saisi en catalogue uniquement (pas OCR)
    prix_conseille_vente: PositiveFloat | None = None

    @model_validator(mode="after")
    def validate_and_compute(self) -> "Product":
        # Note: frozen=True interdit la modification directe des champs.
        # On utilise model_copy pour les calculs de confort si nécessaire,
        # mais ici on préfère valider la cohérence.
        updates = {}

        # ── Auto-calcul prix_remise_ht ──────────────────────────
        if self.prix_brut_ht > 0 and self.remise_pct > 0:
            computed = round(self.prix_brut_ht * (1 - self.remise_pct / 100), 4)
            if self.prix_remise_ht == 0:
                updates["prix_remise_ht"] = computed
            elif computed > 0:
                ecart = abs(self.prix_remise_ht - computed) / computed
                if ecart > 0.02:
                    updates["confidence"] = "low"

        # ── Rétrocompat TTC / IVA21 ──────────────────────────────
        current_ttc = updates.get("prix_ttc_remise", self.prix_ttc_remise)
        current_iva = updates.get("prix_ttc_iva21", self.prix_ttc_iva21)

        if current_ttc <= 0 and current_iva > 0:
            updates["prix_ttc_remise"] = float(current_iva)

        # ── IVA21 / TTC remisé ──────────────────────────────────
        final_ttc = updates.get("prix_ttc_remise", self.prix_ttc_remise)
        if final_ttc > 0:
            updates["prix_ttc_iva21"] = round(final_ttc, 4)
        elif self.prix_remise_ht > 0:
            updates["prix_ttc_iva21"] = round(self.prix_remise_ht * 1.21, 4)

        # ── TTC non remisé ─────────────────────────────────────
        if self.prix_ttc_non_remise <= 0 and self.prix_brut_ht > 0:
            updates["prix_ttc_non_remise"] = round(self.prix_brut_ht * 1.21, 4)

        if updates:
            return self.model_copy(update=updates)
        return self


class InvoiceExtractionResult(BaseModel):
    """Résultat complet d'une extraction de facture via IA."""

    model_config = ConfigDict(frozen=True)

    produits: list[Product]
    fournisseur_detecte: str | None = None
    numero_facture: str | None = None
    date_facture: str | None = None
    langue_detectee: Literal["es", "ca", "fr"] = "es"
    nb_lignes_brutes: int = 0
    tokens_used: int = 0


class BatchSaveRequest(BaseModel):
    """Requête de sauvegarde groupée (max 500 lignes)."""

    produits: Annotated[list[Product], Field(max_length=500)]
    source: Literal["pc", "mobile", "watchdog"] = "pc"


class CatalogueProductUpdate(BaseModel):
    """Champs modifiables en catalogue."""

    model_config = ConfigDict(extra="ignore")

    designation_fr: str | None = None
    designation_raw: str | None = None
    famille: BTDFamille | None = None
    fournisseur: str | None = None
    unite: str | None = None
    prix_brut_ht: PositiveFloat | None = None
    remise_pct: PercentFloat | None = None
    prix_remise_ht: PositiveFloat | None = None
    prix_ttc_remise: PositiveFloat | None = None
    prix_ttc_non_remise: PositiveFloat | None = None
    prix_ttc_iva21: PositiveFloat | None = None
    prix_conseille_vente: PositiveFloat | None = None
