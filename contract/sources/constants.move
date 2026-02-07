/// ============================================================================
/// LayerSplit - Constants and Configuration
/// ============================================================================
/// Global constants used across all LayerSplit modules.
/// 
/// Key Configuration:
/// - GRACE_PERIOD_MS: 3 days before interest starts
/// - DAILY_INTEREST_RATE_BPS: 1% per day (365% APR)
/// - MAX_PARTICIPANTS: 20 per bill
module contract::constants;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

/// Grace period: 3 days in milliseconds
public fun grace_period_ms(): u64 { 259_200_000 } // 3 * 24 * 60 * 60 * 1000

/// Milliseconds per day
public fun ms_per_day(): u64 { 86_400_000 }

// ============================================================================
// INTEREST CONFIGURATION
// ============================================================================

/// Daily interest rate in basis points (100 bps = 1%)
/// 365% APR = 1% per day
public fun daily_interest_rate_bps(): u64 { 100 }

/// Basis points denominator (10000 = 100%)
public fun bps_denominator(): u64 { 10_000 }

// ============================================================================
// LIMITS
// ============================================================================

/// Maximum participants per bill (gas optimization)
public fun max_participants(): u64 { 20 }

// ============================================================================
// SPLIT TYPES
// ============================================================================

/// Equal split among all participants
public fun split_type_equal(): u8 { 0 }

/// Custom amounts per participant
public fun split_type_custom(): u8 { 1 }

/// Dutch (itemized) split
public fun split_type_dutch(): u8 { 2 }
