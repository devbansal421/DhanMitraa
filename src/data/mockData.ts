import type { Insight } from '@/types';

// Placeholder analysis copy for the Insights page. Step 4 replaces this with
// figures computed from the signed-in farmer's real crops, obligations, and
// wallet ledger.

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
