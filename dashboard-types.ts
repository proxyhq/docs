/**
 * TypeScript types for Dashboard ↔ Proxy API integration
 * Copy these to your dashboard project or import from shared package
 */

// ============================================
// Core Entities
// ============================================

export interface Organization {
  id: string;
  clerkOrgId?: string;
  name: string;
  email?: string;
  imageUrl?: string;
  applicationStatus?: ApplicationStatus;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  walletAddress?: string;
  solanaAddress?: string;
  applicationStatus?: ApplicationStatus;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  status: AgentStatus;
  metadata?: Record<string, unknown>;
  // Spending controls
  spendingLimit?: number; // cents
  spendingLimitFrequency?: LimitFrequency;
  currentSpend?: number;
  spendingPeriodStart?: number;
  onLimitExceeded?: LimitExceededAction;
  // Card creation controls
  maxCards?: number;
  defaultCardLimit?: number;
  defaultCardLimitFrequency?: LimitFrequency;
  createdAt: number;
  updatedAt: number;
}

export interface Card {
  id: string;
  agentId: string;
  userId: string;
  organizationId: string;
  status: CardStatus;
  lastFour?: string;
  displayName?: string;
  // Intent
  purpose: string;
  intentMetadata?: Record<string, unknown>;
  // Card type
  type: CardType;
  // Single
  maxAmount?: number;
  // Multi
  merchantHint?: string;
  credentialExposure: CredentialExposure;
  attestationWindowMinutes?: number;
  limitPerAuth?: number;
  limitPerDay?: number;
  limitPerMonth?: number;
  maxAuthCount?: number;
  ttlDays?: number;
  expiresAt?: number;
  merchantFingerprint?: MerchantFingerprint;
  onDrift?: OnDrift;
  // Tracking
  authCount?: number;
  totalSpent?: number;
  dailySpent?: number;
  monthlySpent?: number;
  // Legacy
  limitAmount?: number;
  limitFrequency?: LimitFrequency;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  cardId: string;
  userId: string;
  organizationId: string;
  // Intent correlation
  intentId?: string;
  intentStatus?: "matched" | "mismatched" | "untracked";
  // Attestation
  attestedAccessEventId?: string;
  attestationStatus?: AttestationStatus;
  // Amount
  amount: number; // cents
  currency: string;
  localAmount?: number;
  localCurrency?: string;
  authorizedAmount?: number;
  // Merchant
  merchantName?: string;
  merchantId?: string;
  merchantCategory?: string;
  merchantCategoryCode?: string;
  merchantCity?: string;
  merchantCountry?: string;
  // Enriched
  enrichedMerchantName?: string;
  enrichedMerchantIcon?: string;
  enrichedMerchantCategory?: string;
  // Status
  status: TransactionStatus;
  declinedReason?: string;
  authorizationMethod?: string;
  // Timestamps
  authorizedAt?: number;
  postedAt?: number;
  createdAt: number;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string; // First 8 chars (e.g., "lk_live_")
  isActive: boolean;
  expiresAt?: number;
  createdAt: number;
  lastUsedAt?: number;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  apiKeyId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface CollateralContract {
  id: string;
  userId: string;
  organizationId: string;
  chainId: number;
  userAddress: string;
  proxyAddress: string;
  depositAddress: string;
  controllerAddress: string;
  coordinatorAddress?: string;
  contractVersion: number;
  createdAt: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  organizationId: string;
  chainId: number;
  collateralProxy: string;
  tokenAddress: string;
  amount: number; // token minor units (USDC: 6 decimals, so 1000000 = $1)
  recipientAddress: string;
  transactionHash?: string;
  status: WithdrawalStatus;
  failureReason?: string;
  createdAt: number;
  submittedAt?: number;
  confirmedAt?: number;
}

export interface Challenge {
  id: string;
  cardId: string;
  userId: string;
  organizationId: string;
  transactionAmount: number;
  transactionCurrency: string;
  merchantName: string;
  oneTimePassword: string;
  deliveryMethod: DeliveryMethod;
  expiresAt: number;
  status: ChallengeStatus;
  deliveredAt?: number;
  createdAt: number;
}

export interface Dispute {
  id: string;
  transactionId: string;
  cardId: string;
  userId: string;
  organizationId: string;
  status: DisputeStatus;
  textEvidence?: string;
  resolvedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Statement {
  id: string;
  userId: string;
  periodStart: number;
  periodEnd: number;
  openingBalance: number; // cents
  closingBalance: number; // cents
  creditLimit: number; // cents
  availableCredit: number; // cents
  totalSpent: number; // cents
  totalRefunds?: number; // cents
  totalFees?: number; // cents
  transactionCount: number;
  transactions: Transaction[];
  summaryByMerchant: MerchantSummary[];
  summaryByCategory: CategorySummary[];
  type: StatementType;
  createdAt: number;
}

export interface MerchantSummary {
  merchantName: string;
  transactionCount: number;
  totalAmount: number; // cents
}

export interface CategorySummary {
  category: string;
  categoryCode: string; // MCC
  transactionCount: number;
  totalAmount: number; // cents
}

export interface CredentialAccessEvent {
  id: string;
  cardId: string;
  agentId: string;
  organizationId: string;
  apiKeyId: string;
  attestation: Attestation;
  requestFingerprint?: RequestFingerprint;
  panFingerprint?: string;
  createdAt: number;
}

export interface OrganizationPolicies {
  id: string;
  organizationId: string;

  // Agent defaults
  agentDefaults: {
    spendingLimit?: number;           // cents
    spendingLimitFrequency?: LimitFrequency;
    maxCards?: number;
    defaultCardLimit?: number;
    onLimitExceeded?: LimitExceededAction;
  };

  // Card controls
  cardControls: {
    allowedExposureModes: CredentialExposure[];  // e.g., ["rawPan", "never"]
    defaultAttestationWindow: number;             // minutes (1-60)
    defaultCardType: CardType;
    maxTtlDays: number;
  };

  // Security settings
  security: {
    requireAttestation: boolean;
    autoFreezeUnattested: boolean;
    maxCredentialAccessPerHour: number;
  };

  // Merchant restrictions
  merchantRestrictions: {
    blockedMccs: string[];            // Additional blocked MCCs
    blockedMerchants: string[];       // Specific merchant names
    allowedMccsOnly: boolean;         // Whitelist mode
  };

  createdAt: number;
  updatedAt: number;
}

export type WebhookEvent =
  // Transactions
  | "transaction.authorized"
  | "transaction.completed"
  | "transaction.declined"
  | "transaction.reversed"
  // Cards
  | "card.created"
  | "card.frozen"
  | "card.closed"
  | "card.expired"
  | "card.merchant_drift"
  // Agents
  | "agent.created"
  | "agent.suspended"
  | "agent.limit_exceeded"
  | "agent.limit_approaching"
  // Attestation
  | "credential.accessed"
  | "spend.unattested"
  | "spend.attested"
  // Users
  | "user.application.approved"
  | "user.application.denied"
  | "user.application.needs_info"
  | "user.balance.updated"
  // Deposits & Withdrawals
  | "deposit.received"
  | "deposit.address_ready"
  | "withdrawal.submitted"
  | "withdrawal.confirmed"
  | "withdrawal.failed"
  // 3DS
  | "challenge.requested"
  // Disputes
  | "dispute.created"
  | "dispute.resolved";

// Alias for backwards compatibility
export type AlertEvent = WebhookEvent;

// ============================================
// Enums / Union Types
// ============================================

export type ApplicationStatus =
  | "approved"
  | "pending"
  | "needsInformation"
  | "needsVerification"
  | "manualReview"
  | "denied"
  | "locked"
  | "canceled"
  | "notStarted";

export type AgentStatus = "active" | "suspended";

export type CardStatus = "active" | "frozen" | "closed" | "notActivated";

export type CardType = "single" | "multi";

export type CredentialExposure = "rawPan";

export type OnDrift = "freeze" | "alert";

export type TransactionStatus = "pending" | "completed" | "declined" | "reversed";

export type AttestationStatus = "attested" | "unattested" | "stale";

export type LimitFrequency =
  | "perTransaction"
  | "perAuthorization"
  | "per24HourPeriod"
  | "perWeek"
  | "perMonth"
  | "perYear"
  | "allTime";

export type LimitExceededAction = "suspend" | "notify" | "none";

export type WithdrawalStatus = "pending" | "submitted" | "confirmed" | "failed";

export type ChallengeStatus = "pending" | "delivered" | "failed";

export type DeliveryMethod = "EMAIL" | "SMS" | "WHATSAPP" | "OTHER";

export type DisputeStatus = "pending" | "inReview" | "accepted" | "rejected" | "canceled";

export type StatementType = "monthly" | "custom";

export type ExposureMode = "rawPan";

// ============================================
// Nested Objects
// ============================================

export interface MerchantFingerprint {
  merchantId?: string;
  merchantName?: string;
  merchantCategoryCode?: string;
  merchantCountry?: string;
  capturedAt: number;
}

export interface Attestation {
  summary: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  merchantText?: string;
  reason?: string;
  clientContext?: {
    agentId?: string;
    sessionId?: string;
    toolName?: string;
    sdkVersion?: string;
  };
}

export interface RequestFingerprint {
  ipHash?: string;
  userAgentHash?: string;
  sdkVersion?: string;
}

// ============================================
// API Requests
// ============================================

export interface CreateApiKeyRequest {
  name: string;
  expiresAt?: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  walletAddress?: string;
  solanaAddress?: string;
}

export interface CreateAgentRequest {
  userId: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  spendingLimit?: number;
  spendingLimitFrequency?: LimitFrequency;
  onLimitExceeded?: LimitExceededAction;
  maxCards?: number;
  defaultCardLimit?: number;
  defaultCardLimitFrequency?: LimitFrequency;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
  spendingLimit?: number | null;
  spendingLimitFrequency?: LimitFrequency | null;
  onLimitExceeded?: LimitExceededAction | null;
  maxCards?: number | null;
  defaultCardLimit?: number | null;
  defaultCardLimitFrequency?: LimitFrequency | null;
}

export interface CreateCardRequest {
  purpose: string;
  status?: CardStatus;
  displayName?: string;
  intentMetadata?: Record<string, unknown>;
  type?: CardType;
  // Single
  maxAmount?: number;
  limit?: { amount: number; frequency: LimitFrequency };
  // Multi
  merchantHint?: string;
  credentialExposure?: CredentialExposure;
  limits?: {
    perAuth?: number;
    perDay?: number;
    perMonth?: number;
  };
  maxAuthCount?: number;
  ttlDays?: number;
  onDrift?: OnDrift;
}

export interface UpdateCardRequest {
  status?: CardStatus;
  limit?: { amount: number; frequency: LimitFrequency };
}

export interface CredentialAccessRequest {
  summary: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  merchantText?: string;
  reason?: string;
  clientContext?: {
    agentId?: string;
    sessionId?: string;
    toolName?: string;
    sdkVersion?: string;
  };
}

export interface CreateWithdrawalRequest {
  chainId: number;
  tokenAddress: string;
  amount: number; // token minor units (USDC: 6 decimals, so 1000000 = $1)
  recipientAddress?: string;
}

export interface GenerateStatementRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface UpdatePoliciesRequest {
  agentDefaults?: {
    spendingLimit?: number | null;
    spendingLimitFrequency?: LimitFrequency | null;
    maxCards?: number | null;
    defaultCardLimit?: number | null;
    onLimitExceeded?: LimitExceededAction | null;
  };
  cardControls?: {
    allowedExposureModes?: CredentialExposure[];
    allowRawPan?: boolean;
    defaultAttestationWindow?: number;
    defaultCardType?: CardType;
    maxTtlDays?: number;
  };
  security?: {
    requireAttestation?: boolean;
    autoFreezeUnattested?: boolean;
    maxCredentialAccessPerHour?: number;
  };
  merchantRestrictions?: {
    blockedMccs?: string[];
    blockedMerchants?: string[];
    allowedMccsOnly?: boolean;
  };
}

// ============================================
// Webhook Endpoints (Svix)
// ============================================

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  description?: string;
  status: "enabled" | "disabled";
  events: WebhookEvent[];
  secret: string;  // Only shown at creation
  createdAt: number;
  updatedAt: number;
}

export interface CreateWebhookEndpointRequest {
  url: string;
  description?: string;
  events: WebhookEvent[];
}

export interface UpdateWebhookEndpointRequest {
  url?: string;
  description?: string;
  status?: "enabled" | "disabled";
  events?: WebhookEvent[];
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: WebhookEvent;
  status: "success" | "failed" | "pending";
  responseCode?: number;
  payload: Record<string, unknown>;
  createdAt: number;
  deliveredAt?: number;
}

export interface WebhookEventRecord {
  id: string;
  organizationId: string;
  type: WebhookEvent;
  data: Record<string, unknown>;
  createdAt: number;
}

// ============================================
// API Responses
// ============================================

export interface CreateApiKeyResponse {
  id: string;
  key: string; // Full key, only returned once
  keyPrefix: string;
  name: string;
  organizationId: string;
  isActive: boolean;
  expiresAt?: number;
  createdAt: number;
}

export interface UserBalanceResponse {
  creditLimit: number;
  pendingCharges: number;
  postedCharges: number;
  balanceDue: number;
  spendingPower: number;
}

export interface AgentPolicyResponse {
  agentId: string;
  currentSpend: number;
  spendingLimit?: number;
  spendingLimitFrequency?: LimitFrequency;
  spendingPeriodStart?: number;
  remaining?: number;
  onLimitExceeded?: LimitExceededAction;
}

export interface CredentialAccessResponse {
  accessEventId: string;
  pan: string;
  cvv: string;
  expirationMonth: string;
  expirationYear: string;
  last4: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  code: "BAD_REQUEST" | "AUTH_FAILED" | "NOT_FOUND" | "RATE_LIMITED" | "SERVICE_ERROR";
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format cents to dollars string
 * @param cents Amount in cents (e.g., 5000)
 * @returns Formatted string (e.g., "$50.00")
 */
export function formatMoney(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(dollars);
}

/**
 * Truncate wallet address for display
 * @param address Full address (e.g., "0x1234567890abcdef...")
 * @returns Truncated (e.g., "0x1234...cdef")
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    approved: "green",
    active: "green",
    attested: "green",
    confirmed: "green",
    completed: "green",
    pending: "yellow",
    needsInformation: "orange",
    needsVerification: "orange",
    manualReview: "yellow",
    submitted: "yellow",
    denied: "red",
    locked: "red",
    frozen: "blue",
    closed: "gray",
    canceled: "gray",
    suspended: "red",
    unattested: "red",
    stale: "orange",
    declined: "red",
    reversed: "orange",
    failed: "red",
  };
  return colors[status] || "gray";
}

/**
 * Format timestamp to locale string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
