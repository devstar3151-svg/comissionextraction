export interface CommissionTransaction {
  numero_contrat: string | null;
  produit: string | null;
  support: string | null;
  commission: number | null;
  type_commission: string | null;
}

export interface CommissionStatement {
  assureur: string | null;
  fournisseur: string | null;
  periode: string | null;
  montant_total_declare: number | null;
  transactions: CommissionTransaction[];
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  data?: CommissionStatement;
}
