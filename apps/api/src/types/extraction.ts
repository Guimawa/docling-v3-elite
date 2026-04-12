export type BTDFamille = 
  | 'Armature' | 'Cloison' | 'Climatisation' | 'Plomberie' | 'Électricité' 
  | 'Menuiserie' | 'Couverture' | 'Carrelage' | 'Isolation' | 'Peinture' 
  | 'Outillage' | 'Consommable' | 'Maçonnerie' | 'Terrassement' | 'Autre';

export interface ExtractedProduct {
  fournisseur: string;
  designation_raw: string;
  designation_fr?: string;
  famille: BTDFamille;
  unite: string;
  prix_brut_ht: number;
  remise_pct: number;
  prix_remise_ht: number;
  prix_ttc_remise: number;
  numero_facture?: string;
  date_facture?: string;
}

export interface ExtractionResult {
  fournisseur: string;
  numero_facture: string;
  date_facture: string;
  produits: ExtractedProduct[];
  total_ht: number;
  total_ttc: number;
}
