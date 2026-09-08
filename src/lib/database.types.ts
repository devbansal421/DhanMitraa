/**
 * Database contract for browser queries. Regenerate this after schema changes:
 * `supabase gen types typescript --local > src/lib/database.types.ts`
 */
export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; display_name: string; phone: string | null; created_at: string; updated_at: string }>;
      organizations: Table<{ id: string; legal_name: string; display_name: string; created_at: string; updated_at: string }>;
      organization_memberships: Table<{ organization_id: string; user_id: string; role: Database['public']['Enums']['app_role']; is_owner: boolean; created_at: string }>;
      organization_roles: Table<{ organization_id: string; role: Database['public']['Enums']['app_role']; created_at: string }>;
      crops: Table<{ id: string; name: string; commodity_code: string | null; default_unit: string; created_at: string }>;
      seasons: Table<{ id: string; name: string; starts_on: string | null; ends_on: string | null }>;
      crop_cycles: Table<{ id: string; farmer_org_id: string; crop_id: string; season_id: string | null; expected_quantity: number; quantity_unit: string; estimated_value: number; currency: string; maturity_percent: number; expected_harvest_on: string | null; lifecycle_stage: Database['public']['Enums']['crop_lifecycle_stage']; created_by: string; created_at: string; updated_at: string }>;
      contracts: Table<{ id: string; public_reference: string; crop_cycle_id: string; buyer_org_id: string; seller_org_id: string; status: Database['public']['Enums']['contract_status']; committed_amount: number; currency: string; expected_delivery_on: string | null; terms_version: number; created_by: string; created_at: string; updated_at: string }>;
      contract_obligations: Table<{ id: string; crop_cycle_id: string; contract_id: string | null; payee_org_id: string; obligation_type: Database['public']['Enums']['obligation_type']; description: string; agreed_amount: number; currency: string; status: Database['public']['Enums']['obligation_status']; sort_order: number; created_by: string; created_at: string; updated_at: string }>;
      organization_reputation_summaries: Table<{ organization_id: string; reliability_percent: number; completed_contracts: number; total_settled: number; currency: string; contract_completion_percent: number; payment_reliability_percent: number; delivery_reliability_percent: number; dispute_rate_percent: number; calculated_at: string }>;
      insights: Table<{ id: string; subject_org_id: string; title: string; severity: Database['public']['Enums']['insight_severity']; description: string; inputs_snapshot: Json; generated_at: string; expires_at: string | null; resolved_at: string | null; created_at: string }>;
      recommendations: Table<{ id: string; subject_org_id: string; insight_id: string | null; action_text: string; rank: number; status: 'open' | 'dismissed' | 'completed'; generated_at: string; resolved_at: string | null }>;
      deliveries: Table<Record<string, unknown>>;
      delivery_receipts: Table<Record<string, unknown>>;
      payment_intents: Table<Record<string, unknown>>;
      settlements: Table<Record<string, unknown>>;
      settlement_allocations: Table<Record<string, unknown>>;
      obligation_acceptances: Table<Record<string, unknown>>;
      audit_events: Table<Record<string, unknown>>;
      // Phase 2 wallet (migration 202609080008). Client reads only.
      wallet_accounts: Table<{ user_id: string; balance_paise: number; currency: string; created_at: string; updated_at: string }>;
      wallet_ledger: Table<{ id: string; account_user_id: string; direction: Database['public']['Enums']['wallet_entry_direction']; amount_paise: number; kind: Database['public']['Enums']['wallet_entry_kind']; counterparty_label: string; note: string | null; reference: string; related_order_id: string | null; idempotency_key: string; created_at: string }>;
      payment_orders: Table<{ id: string; user_id: string; provider: string; provider_order_id: string | null; provider_payment_id: string | null; amount_paise: number; status: Database['public']['Enums']['payment_order_status']; created_at: string; updated_at: string }>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      app_role: 'farmer' | 'buyer' | 'supplier' | 'transporter' | 'admin';
      crop_lifecycle_stage: 'planted' | 'inputs_acquired' | 'growing' | 'harvest' | 'buyer_commitment' | 'settlement';
      contract_status: 'draft' | 'proposed' | 'awaiting_parties' | 'active' | 'fulfilment' | 'settlement_pending' | 'settled' | 'cancelled' | 'disputed';
      obligation_type: 'seed' | 'fertilizer' | 'pesticide' | 'machinery' | 'transport' | 'labor' | 'other';
      obligation_status: 'draft' | 'pending_acceptance' | 'secured' | 'locked' | 'paid' | 'cancelled';
      insight_severity: 'low' | 'medium' | 'warning' | 'healthy';
      wallet_entry_direction: 'credit' | 'debit';
      wallet_entry_kind: 'topup' | 'send' | 'receive' | 'obligation' | 'request' | 'settlement' | 'refund' | 'adjustment';
      payment_order_status: 'created' | 'paid' | 'failed' | 'refunded';
    };
    CompositeTypes: Record<never, never>;
  };
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
