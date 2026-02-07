/// ============================================================================
/// LayerSplit - Events
/// ============================================================================
/// All events emitted by the LayerSplit protocol.
/// Events are grouped by category for easy indexing.
module contract::events;

use sui::event;

// ============================================================================
// BILL EVENTS
// ============================================================================

/// Emitted when a new bill is created
public struct BillCreated has copy, drop {
    bill_id: ID,
    creator: address,
    title: vector<u8>,
    total_amount: u64,
    split_type: u8,
    debtor_count: u64,
    created_at: u64,
}

/// Emit BillCreated event
public fun emit_bill_created(
    bill_id: ID,
    creator: address,
    title: vector<u8>,
    total_amount: u64,
    split_type: u8,
    debtor_count: u64,
    created_at: u64,
) {
    event::emit(BillCreated {
        bill_id,
        creator,
        title,
        total_amount,
        split_type,
        debtor_count,
        created_at,
    });
}

/// Emitted when a bill is fully settled
public struct BillSettled has copy, drop {
    bill_id: ID,
    creator: address,
    total_amount: u64,
    timestamp: u64,
}

/// Emit BillSettled event
public fun emit_bill_settled(
    bill_id: ID,
    creator: address,
    total_amount: u64,
    timestamp: u64,
) {
    event::emit(BillSettled {
        bill_id,
        creator,
        total_amount,
        timestamp,
    });
}

// ============================================================================
// DEBT EVENTS
// ============================================================================

/// Emitted when a new debt is created
public struct DebtCreated has copy, drop {
    debt_id: ID,
    bill_id: ID,
    debtor: address,
    creditor: address,
    amount: u64,
    created_at: u64,
}

/// Emit DebtCreated event
public fun emit_debt_created(
    debt_id: ID,
    bill_id: ID,
    debtor: address,
    creditor: address,
    amount: u64,
    created_at: u64,
) {
    event::emit(DebtCreated {
        debt_id,
        bill_id,
        debtor,
        creditor,
        amount,
        created_at,
    });
}

/// Emitted when a debt is fully settled
public struct DebtSettled has copy, drop {
    debt_id: ID,
    bill_id: ID,
    debtor: address,
    creditor: address,
    total_paid: u64,
    total_interest_paid: u64,
    timestamp: u64,
}

/// Emit DebtSettled event
public fun emit_debt_settled(
    debt_id: ID,
    bill_id: ID,
    debtor: address,
    creditor: address,
    total_paid: u64,
    total_interest_paid: u64,
    timestamp: u64,
) {
    event::emit(DebtSettled {
        debt_id,
        bill_id,
        debtor,
        creditor,
        total_paid,
        total_interest_paid,
        timestamp,
    });
}

/// Emitted when a debt is cancelled by bill creator
public struct DebtCancelled has copy, drop {
    debt_id: ID,
    bill_id: ID,
    cancelled_by: address,
    debtor: address,
    amount_forgiven: u64,
    timestamp: u64,
}

/// Emit DebtCancelled event
public fun emit_debt_cancelled(
    debt_id: ID,
    bill_id: ID,
    cancelled_by: address,
    debtor: address,
    amount_forgiven: u64,
    timestamp: u64,
) {
    event::emit(DebtCancelled {
        debt_id,
        bill_id,
        cancelled_by,
        debtor,
        amount_forgiven,
        timestamp,
    });
}

/// Emitted when a debt amount is modified by bill creator
public struct DebtModified has copy, drop {
    debt_id: ID,
    bill_id: ID,
    modified_by: address,
    debtor: address,
    old_amount: u64,
    new_amount: u64,
    timestamp: u64,
}

/// Emit DebtModified event
public fun emit_debt_modified(
    debt_id: ID,
    bill_id: ID,
    modified_by: address,
    debtor: address,
    old_amount: u64,
    new_amount: u64,
    timestamp: u64,
) {
    event::emit(DebtModified {
        debt_id,
        bill_id,
        modified_by,
        debtor,
        old_amount,
        new_amount,
        timestamp,
    });
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

/// Emitted when a payment is made
public struct PaymentMade has copy, drop {
    debt_id: ID,
    payer: address,
    amount: u64,
    principal_paid: u64,
    interest_paid: u64,
    remaining_principal: u64,
    remaining_interest: u64,
    is_settled: bool,
    timestamp: u64,
}

/// Emit PaymentMade event
public fun emit_payment_made(
    debt_id: ID,
    payer: address,
    amount: u64,
    principal_paid: u64,
    interest_paid: u64,
    remaining_principal: u64,
    remaining_interest: u64,
    is_settled: bool,
    timestamp: u64,
) {
    event::emit(PaymentMade {
        debt_id,
        payer,
        amount,
        principal_paid,
        interest_paid,
        remaining_principal,
        remaining_interest,
        is_settled,
        timestamp,
    });
}
