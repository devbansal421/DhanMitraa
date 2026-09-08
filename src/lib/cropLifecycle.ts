import type { CropStage } from '@/types';

export const cropStageOrder: CropStage[] = ['planted', 'inputs_acquired', 'growing', 'harvest', 'buyer_commitment', 'settlement'];
export const cropStageLabels: Record<CropStage, string> = {
  planted: 'Planted', inputs_acquired: 'Inputs acquired', growing: 'Growing', harvest: 'Harvest', buyer_commitment: 'Buyer commitment', settlement: 'Settlement',
};
