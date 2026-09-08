import type { Crop, Participant, Insight } from '@/types';

export const farmerName = 'Ravi Kumar';

export const crops: Crop[] = [
  {
    id: 'wheat-2026',
    name: 'Wheat',
    season: 'Winter 2026',
    tonnes: 4.3,
    estimatedValue: 116100,
    maturity: 78,
    expectedHarvestDate: '18 Dec 2026',
    stage: 'growing',
    buyer: 'Nova Agri Trading',
    buyerCommitment: 116100,
    contractId: 'A7F92',
    obligations: [
      { id: 'o1', label: 'Fertilizer', party: 'Greenfield Fertilizers', amount: 20000, status: 'secured' },
      { id: 'o2', label: 'Machinery', party: 'AgriTech Rentals', amount: 8000, status: 'secured' },
      { id: 'o3', label: 'Transport', party: 'Arun Logistics', amount: 5000, status: 'pending' },
      { id: 'o4', label: 'Labor', party: 'Local Labor Co-op', amount: 7000, status: 'secured' },
    ],
  },
  {
    id: 'cotton-2026',
    name: 'Cotton',
    season: 'Monsoon 2026',
    tonnes: 2.1,
    estimatedValue: 84000,
    maturity: 42,
    expectedHarvestDate: '15 Feb 2027',
    stage: 'inputs_acquired',
    obligations: [
      { id: 'o5', label: 'Seeds', party: 'Greenfield Fertilizers', amount: 12000, status: 'secured' },
      { id: 'o6', label: 'Pesticide', party: 'CropShield Supplies', amount: 6500, status: 'pending' },
    ],
  },
  {
    id: 'rice-2026',
    name: 'Rice',
    season: 'Kharif 2026',
    tonnes: 5.8,
    estimatedValue: 143000,
    maturity: 91,
    expectedHarvestDate: '02 Jan 2027',
    stage: 'buyer_commitment',
    buyer: 'Pioneer Foods',
    buyerCommitment: 143000,
    contractId: 'B3C41',
    obligations: [
      { id: 'o7', label: 'Fertilizer', party: 'Greenfield Fertilizers', amount: 22000, status: 'secured' },
      { id: 'o8', label: 'Machinery', party: 'AgriTech Rentals', amount: 10000, status: 'secured' },
      { id: 'o9', label: 'Transport', party: 'Arun Logistics', amount: 7000, status: 'secured' },
      { id: 'o10', label: 'Labor', party: 'Local Labor Co-op', amount: 9000, status: 'secured' },
    ],
  },
];

export const participants: Participant[] = [
  {
    id: 'greenfield',
    name: 'Greenfield Fertilizers',
    type: 'Supplier',
    reliability: 96,
    completedContracts: 184,
    totalSettled: 1240000,
    metrics: {
      contractCompletion: 98,
      paymentReliability: 96,
      deliveryReliability: 97,
      disputeRate: 2,
    },
  },
  {
    id: 'arun-logistics',
    name: 'Arun Logistics',
    type: 'Transporter',
    reliability: 93,
    completedContracts: 67,
    totalSettled: 480000,
    metrics: {
      contractCompletion: 94,
      paymentReliability: 92,
      deliveryReliability: 95,
      disputeRate: 4,
    },
  },
  {
    id: 'nova-agri',
    name: 'Nova Agri Trading',
    type: 'Buyer',
    reliability: 97,
    completedContracts: 312,
    totalSettled: 3850000,
    metrics: {
      contractCompletion: 99,
      paymentReliability: 97,
      deliveryReliability: 95,
      disputeRate: 1,
    },
  },
  {
    id: 'agritech-rentals',
    name: 'AgriTech Rentals',
    type: 'Supplier',
    reliability: 91,
    completedContracts: 142,
    totalSettled: 720000,
    metrics: {
      contractCompletion: 93,
      paymentReliability: 90,
      deliveryReliability: 92,
      disputeRate: 5,
    },
  },
  {
    id: 'pioneer-foods',
    name: 'Pioneer Foods',
    type: 'Buyer',
    reliability: 94,
    completedContracts: 201,
    totalSettled: 2760000,
    metrics: {
      contractCompletion: 96,
      paymentReliability: 95,
      deliveryReliability: 93,
      disputeRate: 3,
    },
  },
  {
    id: 'local-labor',
    name: 'Local Labor Co-op',
    type: 'Supplier',
    reliability: 89,
    completedContracts: 98,
    totalSettled: 340000,
    metrics: {
      contractCompletion: 91,
      paymentReliability: 88,
      deliveryReliability: 90,
      disputeRate: 6,
    },
  },
];

export const insights: Insight[] = [
  {
    id: 'i1',
    title: 'Cash-Flow Risk',
    level: 'Low',
    description: 'Your current crop commitments are within a healthy range relative to projected harvest value.',
  },
  {
    id: 'i2',
    title: 'Buyer Concentration',
    level: 'Medium',
    description: '82% of your expected revenue currently depends on one buyer.',
  },
  {
    id: 'i3',
    title: 'Transport Cost',
    level: 'Warning',
    description: 'Your transport commitment is 38% above the estimated regional benchmark.',
  },
];

export const recommendedActions = [
  'Diversify your buyer network',
  'Review transport contract',
  'Maintain ₹15,000 liquidity buffer',
];

export const cropStageLabels: Record<string, string> = {
  planted: 'Planted',
  inputs_acquired: 'Inputs Acquired',
  growing: 'Growing',
  harvest: 'Harvest',
  buyer_commitment: 'Buyer Commitment',
  settlement: 'Settlement',
};

export const cropStageOrder = [
  'planted',
  'inputs_acquired',
  'growing',
  'harvest',
  'buyer_commitment',
  'settlement',
] as const;
