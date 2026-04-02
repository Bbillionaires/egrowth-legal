// ─────────────────────────────────────────
// eGrowth Legal — Platform Types
// ─────────────────────────────────────────

export type UserRole = 'master' | 'admin' | 'staff' | 'notary' | 'client'
export type ServiceType = 'trust_estate' | 'for_profit' | 'nonprofit' | 'trustee_service'
export type DocumentStatus = 'draft' | 'generated' | 'queued' | 'in_review' | 'approved' | 'submitted' | 'complete' | 'rejected'
export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned'
export type TrusteeFeeType = 'flat' | 'percentage' | 'both'

// ─── Auth / Profiles ───────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  created_by: string | null
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ─── Clients ───────────────────────────
export interface Client {
  id: string
  profile_id: string | null
  full_name: string
  email: string
  phone: string | null
  dob: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  assigned_to: string | null
  created_by: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joins
  assigned_profile?: Profile
}

// ─── Interviews ────────────────────────
export interface Interview {
  id: string
  client_id: string
  service_type: ServiceType
  status: InterviewStatus
  current_step: number
  total_steps: number
  answers: InterviewAnswers
  started_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joins
  client?: Client
}

export interface InterviewAnswers {
  // Step 1 - Service Selection
  service_type?: ServiceType
  sub_type?: string

  // Step 2 - Client Info
  full_name?: string
  email?: string
  phone?: string
  dob?: string
  state?: string

  // Step 3 - Document Details (varies by service)
  trust_name?: string
  trust_type?: string
  successor_trustee_name?: string
  successor_trustee_relation?: string
  beneficiaries?: string
  use_egrowth_trustee?: boolean

  // For-Profit
  entity_name?: string
  entity_type?: string
  registered_agent?: string
  members?: string
  purpose?: string

  // Nonprofit
  org_name?: string
  mission_statement?: string
  board_members?: string
  tax_year?: string

  // Step 4 - Additional
  add_trustee_service?: boolean
  notary_required?: boolean
  special_instructions?: string

  [key: string]: unknown
}

// ─── Documents ─────────────────────────
export interface Document {
  id: string
  client_id: string
  interview_id: string | null
  name: string
  document_type: string
  service_type: ServiceType
  status: DocumentStatus
  storage_path: string | null
  signed_path: string | null
  notarized_path: string | null
  is_trustee_file: boolean
  generated_by: string | null
  reviewed_by: string | null
  notarized_by: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // joins
  client?: Client
}

// ─── Submission Queue ──────────────────
export interface QueueItem {
  id: string
  document_id: string
  client_id: string
  assigned_to: string | null
  status: DocumentStatus
  priority: 1 | 2 | 3
  filing_state: string | null
  notes: string | null
  internal_notes: string | null
  submitted_at: string | null
  confirmation_no: string | null
  created_at: string
  updated_at: string
  // joins
  document?: Document
  client?: Client
  assignee?: Profile
}

// ─── Trustee ───────────────────────────
export interface TrusteeAccount {
  id: string
  client_id: string
  trust_name: string
  trust_type: string
  fee_type: TrusteeFeeType
  flat_fee_cents: number
  fee_percentage: number
  estate_value: number | null
  billing_cycle: string
  next_billing: string | null
  last_billed: string | null
  is_active: boolean
  managed_by: string | null
  created_at: string
  updated_at: string
  // joins
  client?: Client
  manager?: Profile
}

export interface TrusteeLedgerEntry {
  id: string
  trustee_id: string
  client_id: string
  type: 'flat_fee' | 'percentage_fee' | 'payment'
  amount_cents: number
  description: string | null
  stripe_payment: string | null
  created_at: string
}

// ─── Notifications ─────────────────────
export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link: string | null
  created_at: string
}

// ─── Dashboard Stats ───────────────────
export interface DashboardStats {
  active_clients: number
  pending_queue: number
  docs_generated: number
  trustee_revenue_cents: number
  service_breakdown: { type: ServiceType; count: number; percent: number }[]
}

// ─── Interview Wizard Steps ────────────
export interface WizardStep {
  id: number
  title: string
  description: string
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Service',     description: 'Select the service type' },
  { id: 2, title: 'Client Info', description: 'Basic client information' },
  { id: 3, title: 'Details',     description: 'Document-specific details' },
  { id: 4, title: 'Review',      description: 'Review before generating' },
  { id: 5, title: 'Generate',    description: 'Documents generated' },
]

// ─── Document Templates Map ────────────
export const DOCUMENTS_BY_SERVICE: Record<ServiceType, string[]> = {
  trust_estate: [
    'Revocable Living Trust',
    'Irrevocable Trust',
    'Land Trust',
    'Pour-Over Will',
    'Durable Power of Attorney',
    'Healthcare Directive',
    'HIPAA Authorization',
  ],
  for_profit: [
    'Articles of Organization',
    'Operating Agreement',
    'S-Corp Election (Form 2553)',
    'Bylaws',
    'Initial Resolutions',
  ],
  nonprofit: [
    'Articles of Incorporation',
    'Bylaws',
    'IRS Form 1023 Prep',
    'IRS Form 1023-EZ Prep',
    'Conflict of Interest Policy',
    'Meeting Minutes Template',
  ],
  trustee_service: [
    'Trustee Agreement',
    'File Custody Agreement',
    'Fee Schedule',
  ],
}

// ─── Role permissions ──────────────────
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  master:  ['*'],
  admin:   ['clients.*', 'documents.*', 'queue.*', 'trustee.*', 'team.read', 'team.create_staff'],
  staff:   ['clients.read', 'clients.update', 'documents.read', 'documents.update', 'queue.read', 'queue.update'],
  notary:  ['clients.read', 'documents.read', 'documents.notarize', 'queue.read'],
  client:  ['clients.own', 'documents.own', 'trustee.own'],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (perms.includes('*')) return true
  if (perms.includes(permission)) return true
  const [resource] = permission.split('.')
  if (perms.includes(`${resource}.*`)) return true
  return false
}
