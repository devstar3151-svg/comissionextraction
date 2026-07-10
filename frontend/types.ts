export interface CommissionExtracted {
  client_nom_prenom: string | null;
  numero_contrat: string | null;
  produit_nom: string | null;
  support_actif: string | null;
  nature_commission: string | null;
  detail_reporting_cible: string | null;
  montant_net: number | null;
}

export interface CommissionMetadata {
  assureur: string | null;
  cabinet_beneficiaire: string | null;
  reference_bordereau: string | null;
  code_apporteur: string | null;
  date_debut_periode: string | null;
  date_fin_periode: string | null;
  montant_total_paye: number | null;
}

export interface CommissionStatement {
  metadata: CommissionMetadata;
  commissions_extraites: CommissionExtracted[];
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  data?: CommissionStatement;
}
