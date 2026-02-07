/// ============================================================================
/// LayerSplit - Error Codes
/// ============================================================================
/// Centralized error codes for all LayerSplit modules.
/// Each error has a unique code and descriptive name.
module contract::errors;

// ============================================================================
// AUTHORIZATION ERRORS (1xx)
// ============================================================================

/// Caller is not authorized to perform this action
public fun not_authorized(): u64 { 1 }

/// Only bill creator can perform this action
public fun not_bill_creator(): u64 { 2 }

/// Only debtor can pay their own debt
public fun not_debtor(): u64 { 3 }

// ============================================================================
// VALIDATION ERRORS (2xx)
// ============================================================================

/// Amount must be greater than zero
public fun invalid_amount(): u64 { 100 }

/// Split amounts must sum to bill total
public fun invalid_split_amounts(): u64 { 101 }

/// Maximum participants exceeded (limit: 20)
public fun max_participants_exceeded(): u64 { 102 }

/// Cannot create debt to yourself
public fun self_debt_not_allowed(): u64 { 103 }

/// Debtors and amounts vectors must have same length
public fun mismatched_vectors(): u64 { 104 }

// ============================================================================
// STATE ERRORS (3xx)
// ============================================================================

/// Debt is already settled
public fun debt_already_settled(): u64 { 200 }

/// Bill is already settled
public fun bill_already_settled(): u64 { 201 }

/// Cannot modify bill with existing payments
public fun bill_has_payments(): u64 { 202 }

// ============================================================================
// PAYMENT ERRORS (4xx)
// ============================================================================

/// Payment amount is less than required
public fun insufficient_payment(): u64 { 300 }
