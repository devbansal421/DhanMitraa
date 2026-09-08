import type { Crop, Participant } from '@/types';
import type { SettlementRecord } from '@/services/settlementsRepository';
import type { WalletTx } from '@/lib/payments';

/**
 * Illustrative demo content shown when the signed-in account is not yet linked
 * to a farm organisation (or the workspace is empty). It lets the Crops,
 * Contracts, Network, Settlement and Wallet screens tell the full story without
 * a provisioned backend.
 */

const O = {
  greenfield: 'org-greenfield',
  arun: 'org-arun',
  nova: 'org-nova',
  agritech: 'org-agritech',
  pioneer: 'org-pioneer',
  labor: 'org-labor',
  cropshield: 'org-cropshield',
  sunrise: 'org-sunrise',
  bharatagro: 'org-bharatagro',
  annapurna: 'org-annapurna',
  greenharvest: 'org-greenharvest',
  rapidfreight: 'org-rapidfreight',
  grameen: 'org-grameen',
  bhoomi: 'org-bhoomi',
};

export const demoCrops: Crop[] = [
  {
    id: 'c-maize-26', name: 'Maize', season: 'Kharif 2026', tonnes: 5.5, estimatedValue: 91000,
    maturity: 96, expectedHarvestDate: '15 Oct 2026', stage: 'harvest',
    buyer: 'Nova Agri Trading', buyerCommitment: 91000, contractId: 'L9Z07',
    obligations: [
      { id: 'o-1', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 15000, status: 'secured' },
      { id: 'o-2', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 6000, status: 'secured' },
      { id: 'o-3', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 9000, status: 'pending' },
    ],
  },
  {
    id: 'c-wheat-26', name: 'Wheat', season: 'Winter 2026', tonnes: 4.3, estimatedValue: 116100,
    maturity: 78, expectedHarvestDate: '18 Dec 2026', stage: 'growing',
    buyer: 'Nova Agri Trading', buyerCommitment: 116100, contractId: 'A7F92',
    obligations: [
      { id: 'o-4', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 20000, status: 'secured' },
      { id: 'o-5', label: 'Machinery', party: 'AgriTech Rentals', partyOrgId: O.agritech, amount: 8000, status: 'secured' },
      { id: 'o-6', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 5000, status: 'pending' },
      { id: 'o-7', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 7000, status: 'secured' },
    ],
  },
  {
    id: 'c-rice-26', name: 'Rice', season: 'Kharif 2026', tonnes: 5.8, estimatedValue: 143000,
    maturity: 91, expectedHarvestDate: '02 Jan 2027', stage: 'buyer_commitment',
    buyer: 'Pioneer Foods', buyerCommitment: 143000, contractId: 'B3C41',
    obligations: [
      { id: 'o-8', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 22000, status: 'secured' },
      { id: 'o-9', label: 'Machinery', party: 'AgriTech Rentals', partyOrgId: O.agritech, amount: 10000, status: 'secured' },
      { id: 'o-10', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 7000, status: 'secured' },
      { id: 'o-11', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 9000, status: 'secured' },
    ],
  },
  {
    id: 'c-bajra-26', name: 'Bajra', season: 'Kharif 2026', tonnes: 3.2, estimatedValue: 64000,
    maturity: 55, expectedHarvestDate: '25 Nov 2026', stage: 'growing',
    buyer: 'Pioneer Foods', buyerCommitment: 64000, contractId: 'K6Y42',
    obligations: [
      { id: 'o-12', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 10000, status: 'secured' },
      { id: 'o-13', label: 'Transport', party: 'RapidFreight Carriers', partyOrgId: O.rapidfreight, amount: 4000, status: 'pending' },
      { id: 'o-14', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 6000, status: 'secured' },
    ],
  },
  {
    id: 'c-cotton-26', name: 'Cotton', season: 'Monsoon 2026', tonnes: 2.1, estimatedValue: 84000,
    maturity: 42, expectedHarvestDate: '15 Feb 2027', stage: 'inputs_acquired',
    buyer: 'Annapurna Foods', buyerCommitment: 84000, contractId: 'M4B18',
    obligations: [
      { id: 'o-15', label: 'Seeds', party: 'Sunrise Seeds', partyOrgId: O.sunrise, amount: 12000, status: 'secured' },
      { id: 'o-16', label: 'Pesticide', party: 'CropShield Supplies', partyOrgId: O.cropshield, amount: 6500, status: 'pending' },
    ],
  },
  {
    id: 'c-sugarcane-25', name: 'Sugarcane', season: 'Kharif 2025', tonnes: 40, estimatedValue: 240000,
    maturity: 100, expectedHarvestDate: '15 Nov 2025', stage: 'settlement',
    buyer: 'Pioneer Foods', buyerCommitment: 240000, contractId: 'D4M88',
    obligations: [
      { id: 'o-17', label: 'Fertilizer', party: 'Sunrise Seeds', partyOrgId: O.sunrise, amount: 42000, status: 'secured' },
      { id: 'o-18', label: 'Transport', party: 'RapidFreight Carriers', partyOrgId: O.rapidfreight, amount: 15000, status: 'secured' },
      { id: 'o-19', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 20000, status: 'secured' },
    ],
  },
  {
    id: 'c-soybean-25', name: 'Soybean', season: 'Kharif 2025', tonnes: 8, estimatedValue: 128000,
    maturity: 100, expectedHarvestDate: '30 Oct 2025', stage: 'settlement',
    buyer: 'BharatAgro Warehousing', buyerCommitment: 128000, contractId: 'E7P33',
    obligations: [
      { id: 'o-20', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 20000, status: 'secured' },
      { id: 'o-21', label: 'Transport', party: 'Grameen Transport Union', partyOrgId: O.grameen, amount: 7000, status: 'secured' },
      { id: 'o-22', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 11000, status: 'secured' },
    ],
  },
  {
    id: 'c-mustard-25', name: 'Mustard', season: 'Rabi 2025', tonnes: 4.4, estimatedValue: 88000,
    maturity: 100, expectedHarvestDate: '10 Mar 2025', stage: 'settlement',
    buyer: 'Annapurna Foods', buyerCommitment: 88000, contractId: 'F2R55',
    obligations: [
      { id: 'o-23', label: 'Fertilizer', party: 'Bhoomi Krishi Kendra', partyOrgId: O.bhoomi, amount: 14000, status: 'secured' },
      { id: 'o-24', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 5000, status: 'secured' },
      { id: 'o-25', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 7000, status: 'secured' },
    ],
  },
  {
    id: 'c-chickpea-25', name: 'Chickpea', season: 'Rabi 2025', tonnes: 3.6, estimatedValue: 102000,
    maturity: 100, expectedHarvestDate: '22 Mar 2025', stage: 'settlement',
    buyer: 'Nova Agri Trading', buyerCommitment: 102000, contractId: 'G8T14',
    obligations: [
      { id: 'o-26', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 15000, status: 'secured' },
      { id: 'o-27', label: 'Transport', party: 'RapidFreight Carriers', partyOrgId: O.rapidfreight, amount: 6000, status: 'secured' },
      { id: 'o-28', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 9000, status: 'secured' },
    ],
  },
  {
    id: 'c-groundnut-25', name: 'Groundnut', season: 'Zaid 2025', tonnes: 2.8, estimatedValue: 76000,
    maturity: 100, expectedHarvestDate: '05 Jun 2025', stage: 'settlement',
    buyer: 'GreenHarvest Exporters', buyerCommitment: 76000, contractId: 'H5W60',
    obligations: [
      { id: 'o-29', label: 'Fertilizer', party: 'Sunrise Seeds', partyOrgId: O.sunrise, amount: 12000, status: 'secured' },
      { id: 'o-30', label: 'Transport', party: 'Grameen Transport Union', partyOrgId: O.grameen, amount: 4000, status: 'secured' },
      { id: 'o-31', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 6000, status: 'secured' },
    ],
  },
  {
    id: 'c-wheat-25', name: 'Wheat', season: 'Rabi 2025', tonnes: 4.1, estimatedValue: 118000,
    maturity: 100, expectedHarvestDate: '18 Mar 2025', stage: 'settlement',
    buyer: 'Nova Agri Trading', buyerCommitment: 118000, contractId: 'J3X29',
    obligations: [
      { id: 'o-32', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 20000, status: 'secured' },
      { id: 'o-33', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 7000, status: 'secured' },
      { id: 'o-34', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 10000, status: 'secured' },
    ],
  },
  {
    id: 'c-maize-25', name: 'Maize', season: 'Kharif 2025', tonnes: 6, estimatedValue: 96000,
    maturity: 100, expectedHarvestDate: '20 Oct 2025', stage: 'settlement',
    buyer: 'Nova Agri Trading', buyerCommitment: 96000, contractId: 'C9K21',
    obligations: [
      { id: 'o-35', label: 'Fertilizer', party: 'Greenfield Fertilizers', partyOrgId: O.greenfield, amount: 18000, status: 'secured' },
      { id: 'o-36', label: 'Transport', party: 'Arun Logistics', partyOrgId: O.arun, amount: 6000, status: 'secured' },
      { id: 'o-37', label: 'Labor', party: 'Local Labor Co-op', partyOrgId: O.labor, amount: 8000, status: 'secured' },
    ],
  },
];

const m = (contractCompletion: number, paymentReliability: number, deliveryReliability: number, disputeRate: number) =>
  ({ contractCompletion, paymentReliability, deliveryReliability, disputeRate });

export const demoParticipants: Participant[] = [
  { id: O.greenfield, name: 'Greenfield Fertilizers', type: 'Supplier', reliability: 96, completedContracts: 184, totalSettled: 1240000, metrics: m(98, 96, 97, 2) },
  { id: O.arun, name: 'Arun Logistics', type: 'Transporter', reliability: 93, completedContracts: 67, totalSettled: 480000, metrics: m(94, 92, 95, 4) },
  { id: O.nova, name: 'Nova Agri Trading', type: 'Buyer', reliability: 97, completedContracts: 312, totalSettled: 3850000, metrics: m(99, 97, 95, 1) },
  { id: O.agritech, name: 'AgriTech Rentals', type: 'Supplier', reliability: 91, completedContracts: 142, totalSettled: 720000, metrics: m(93, 90, 92, 5) },
  { id: O.pioneer, name: 'Pioneer Foods', type: 'Buyer', reliability: 94, completedContracts: 201, totalSettled: 2760000, metrics: m(96, 95, 93, 3) },
  { id: O.labor, name: 'Local Labor Co-op', type: 'Supplier', reliability: 89, completedContracts: 98, totalSettled: 340000, metrics: m(91, 88, 90, 6) },
  { id: O.cropshield, name: 'CropShield Supplies', type: 'Supplier', reliability: 88, completedContracts: 54, totalSettled: 210000, metrics: m(90, 87, 89, 7) },
  { id: O.sunrise, name: 'Sunrise Seeds', type: 'Supplier', reliability: 95, completedContracts: 233, totalSettled: 1870000, metrics: m(97, 95, 96, 2) },
  { id: O.bharatagro, name: 'BharatAgro Warehousing', type: 'Buyer', reliability: 96, completedContracts: 288, totalSettled: 4120000, metrics: m(98, 96, 97, 2) },
  { id: O.annapurna, name: 'Annapurna Foods', type: 'Buyer', reliability: 93, completedContracts: 174, totalSettled: 2310000, metrics: m(95, 94, 92, 3) },
  { id: O.greenharvest, name: 'GreenHarvest Exporters', type: 'Buyer', reliability: 98, completedContracts: 402, totalSettled: 6740000, metrics: m(99, 98, 98, 1) },
  { id: O.rapidfreight, name: 'RapidFreight Carriers', type: 'Transporter', reliability: 92, completedContracts: 119, totalSettled: 640000, metrics: m(93, 91, 94, 4) },
  { id: O.grameen, name: 'Grameen Transport Union', type: 'Transporter', reliability: 87, completedContracts: 61, totalSettled: 250000, metrics: m(89, 86, 88, 8) },
  { id: O.bhoomi, name: 'Bhoomi Krishi Kendra', type: 'Supplier', reliability: 89, completedContracts: 71, totalSettled: 330000, metrics: m(91, 88, 90, 6) },
];

type Alloc = SettlementRecord['allocations'][number];
const alloc = (id: string, recipient: string, amount: number, kind: string, status = 'succeeded'): Alloc =>
  ({ id, recipient, amount, kind, status });

function completed(ref: string, gross: number, fert: [string, number], trans: [string, number], labor: number): SettlementRecord {
  return {
    id: `s-${ref}`, contractReference: ref, grossAmount: gross, status: 'completed', approvalRequired: true,
    allocations: [
      alloc(`a-${ref}-1`, fert[0], fert[1], 'obligation'),
      alloc(`a-${ref}-2`, trans[0], trans[1], 'obligation'),
      alloc(`a-${ref}-3`, 'Local Labor Co-op', labor, 'obligation'),
      alloc(`a-${ref}-4`, 'Ravi Kumar', gross - fert[1] - trans[1] - labor, 'farmer_proceeds'),
    ],
  };
}

export const demoSettlements: SettlementRecord[] = [
  {
    id: 's-L9Z07', contractReference: 'L9Z07', grossAmount: 91000, status: 'awaiting_approval', approvalRequired: true,
    allocations: [
      alloc('a-L9Z07-1', 'Greenfield Fertilizers', 15000, 'obligation', 'created'),
      alloc('a-L9Z07-2', 'Arun Logistics', 6000, 'obligation', 'created'),
      alloc('a-L9Z07-3', 'Local Labor Co-op', 9000, 'obligation', 'created'),
      alloc('a-L9Z07-4', 'Ravi Kumar', 61000, 'farmer_proceeds', 'created'),
    ],
  },
  {
    id: 's-A7F92', contractReference: 'A7F92', grossAmount: 116100, status: 'awaiting_verification', approvalRequired: true,
    allocations: [
      alloc('a-A7F92-1', 'Greenfield Fertilizers', 20000, 'obligation', 'created'),
      alloc('a-A7F92-2', 'AgriTech Rentals', 8000, 'obligation', 'created'),
      alloc('a-A7F92-3', 'Arun Logistics', 5000, 'obligation', 'created'),
      alloc('a-A7F92-4', 'Local Labor Co-op', 7000, 'obligation', 'created'),
      alloc('a-A7F92-5', 'Ravi Kumar', 76100, 'farmer_proceeds', 'created'),
    ],
  },
  { id: 's-B3C41', contractReference: 'B3C41', grossAmount: 143000, status: 'awaiting_funding', approvalRequired: true, allocations: [] },
  { id: 's-K6Y42', contractReference: 'K6Y42', grossAmount: 64000, status: 'draft', approvalRequired: true, allocations: [] },
  { id: 's-M4B18', contractReference: 'M4B18', grossAmount: 84000, status: 'draft', approvalRequired: true, allocations: [] },
  completed('D4M88', 240000, ['Sunrise Seeds', 42000], ['RapidFreight Carriers', 15000], 20000),
  completed('E7P33', 128000, ['Greenfield Fertilizers', 20000], ['Grameen Transport Union', 7000], 11000),
  completed('F2R55', 88000, ['Bhoomi Krishi Kendra', 14000], ['Arun Logistics', 5000], 7000),
  completed('G8T14', 102000, ['Greenfield Fertilizers', 15000], ['RapidFreight Carriers', 6000], 9000),
  completed('H5W60', 76000, ['Sunrise Seeds', 12000], ['Grameen Transport Union', 4000], 6000),
  completed('J3X29', 118000, ['Greenfield Fertilizers', 20000], ['Arun Logistics', 7000], 10000),
  completed('C9K21', 96000, ['Greenfield Fertilizers', 18000], ['Arun Logistics', 6000], 8000),
];

const daysAgo = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString();
};

export const demoWallet: { balance: number; transactions: WalletTx[] } = {
  balance: 18450,
  transactions: [
    { id: 'w-1', direction: 'in', kind: 'settlement', amount: 76100, counterparty: 'Wheat settlement — J3X29', note: 'Farmer proceeds', reference: 'DM-SET-4K21', createdAt: daysAgo(41), status: 'completed' },
    { id: 'w-2', direction: 'out', kind: 'obligation', amount: 20000, counterparty: 'Greenfield Fertilizers', note: 'Fertilizer · Wheat', reference: 'DM-7F3K2P', createdAt: daysAgo(38), status: 'completed' },
    { id: 'w-3', direction: 'out', kind: 'obligation', amount: 7000, counterparty: 'Arun Logistics', note: 'Transport · Wheat', reference: 'DM-9M4T1Q', createdAt: daysAgo(37), status: 'completed' },
    { id: 'w-4', direction: 'out', kind: 'send', amount: 5500, counterparty: 'Local Labor Co-op', note: 'Advance', reference: 'DM-2B8N6R', createdAt: daysAgo(20), status: 'completed' },
    { id: 'w-5', direction: 'in', kind: 'receive', amount: 12000, counterparty: 'Nova Agri Trading', note: 'Advance against Maize contract', reference: 'DM-5C9X3L', createdAt: daysAgo(12), status: 'completed' },
    { id: 'w-6', direction: 'out', kind: 'obligation', amount: 6000, counterparty: 'Arun Logistics', note: 'Transport · Maize', reference: 'DM-8Q2W7K', createdAt: daysAgo(6), status: 'completed' },
  ],
};
