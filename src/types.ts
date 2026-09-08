export type CropStage =
  | 'planted'
  | 'inputs_acquired'
  | 'growing'
  | 'harvest'
  | 'buyer_commitment'
  | 'settlement';

export type ObligationStatus = 'secured' | 'pending';

export type SettlementStep =
  | 'buyer_funded'
  | 'harvest_verified'
  | 'delivery_confirmed'
  | 'settlement'
  | 'completed';

export interface Obligation {
  id: string;
  label: string;
  party: string;
  /** Wallet holder this obligation is paid to. Empty if not linked to an org. */
  partyOrgId: string;
  amount: number;
  status: ObligationStatus;
}

export interface Crop {
  id: string;
  name: string;
  season: string;
  tonnes: number;
  estimatedValue: number;
  maturity: number;
  expectedHarvestDate: string;
  stage: CropStage;
  obligations: Obligation[];
  buyer?: string;
  buyerCommitment?: number;
  contractId?: string;
}

export interface Participant {
  id: string;
  name: string;
  type: 'Supplier' | 'Transporter' | 'Buyer' | 'Farmer';
  reliability: number;
  completedContracts: number;
  totalSettled: number;
  metrics: {
    contractCompletion: number;
    paymentReliability: number;
    deliveryReliability: number;
    disputeRate: number;
  };
}

export interface Insight {
  id: string;
  title: string;
  level: 'Low' | 'Medium' | 'Warning' | 'Healthy';
  description: string;
}

export interface OfflineTx {
  id: string;
  label: string;
  amount: number;
  synced: boolean;
}
