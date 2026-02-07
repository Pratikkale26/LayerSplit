/// ============================================================================
/// LayerSplit - Bill Creation Module
/// ============================================================================
/// Functions for creating bills with different split types:
/// - Equal split: Same amount for all participants
/// - Custom split: Different amounts per participant
/// - Dutch split: Itemized split based on consumed items
module contract::bill;

// ============================================================================
// IMPORTS
// ============================================================================

use sui::clock::{Self, Clock};
use contract::types::{Self, Bill, Debt, DueItem, BillRegistry};
use contract::constants;
use contract::errors;
use contract::events;

// ============================================================================
// EQUAL SPLIT
// ============================================================================

/// Create a bill with equal split among all participants
/// 
/// # Arguments
/// * `registry` - The bill registry (shared object)
/// * `clock` - Sui Clock for timestamps
/// * `title` - Bill title
/// * `description` - Bill description
/// * `total_amount` - Total amount to split
/// * `debtors` - List of debtor addresses
/// * `receipt_hash` - Optional IPFS hash of receipt image
/// 
/// # Returns
/// * `Bill` - The created bill (share using `share_bill`)
/// * `vector<Debt>` - Debts for each participant (transfer using `transfer_debts`)
public fun create_equal_split(
    registry: &mut BillRegistry,
    clock: &Clock,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    debtors: vector<address>,
    receipt_hash: option::Option<vector<u8>>,
    ctx: &mut TxContext
): (Bill, vector<Debt>) {
    let creator = ctx.sender();
    let debtor_count = debtors.length();
    
    // Validations
    assert!(total_amount > 0, errors::invalid_amount());
    assert!(
        debtor_count > 0 && debtor_count <= constants::max_participants(), 
        errors::max_participants_exceeded()
    );
    
    let now = clock::timestamp_ms(clock);
    let grace_end = now + constants::grace_period_ms();
    
    // Calculate equal share
    let share_amount = total_amount / (debtor_count as u64);
    
    // Create bill
    let bill = types::new_bill(
        creator,
        title,
        description,
        total_amount,
        constants::split_type_equal(),
        receipt_hash,
        now,
        grace_end,
        debtor_count as u64,
        ctx
    );
    let bill_id = types::bill_id(&bill);
    
    // Create debts (excluding creator)
    let mut debts = vector::empty<Debt>();
    let mut actual_debtor_count = 0u64;
    let mut i = 0;
    
    while (i < debtor_count) {
        let debtor = *debtors.borrow(i);
        
        // Skip if debtor is the creator
        if (debtor != creator) {
            let debt = types::new_debt(
                bill_id,
                debtor,
                creator,
                share_amount,
                vector::empty(),
                now,
                ctx
            );
            
            events::emit_debt_created(
                types::debt_id(&debt),
                bill_id,
                debtor,
                creator,
                share_amount,
                now
            );
            
            debts.push_back(debt);
            actual_debtor_count = actual_debtor_count + 1;
        };
        
        i = i + 1;
    };
    
    // Update registry
    types::increment_registry_stats(registry, total_amount);
    
    // Emit bill created event
    events::emit_bill_created(
        bill_id,
        creator,
        types::bill_title(&bill),
        total_amount,
        constants::split_type_equal(),
        actual_debtor_count,
        now
    );
    
    (bill, debts)
}

// ============================================================================
// CUSTOM SPLIT
// ============================================================================

/// Create a bill with custom amounts per participant
/// 
/// # Arguments
/// * `registry` - The bill registry
/// * `clock` - Sui Clock
/// * `title` - Bill title
/// * `description` - Bill description
/// * `total_amount` - Total amount (must equal sum of amounts)
/// * `debtors` - List of debtor addresses
/// * `amounts` - Corresponding amounts for each debtor
/// * `receipt_hash` - Optional receipt hash
public fun create_custom_split(
    registry: &mut BillRegistry,
    clock: &Clock,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    debtors: vector<address>,
    amounts: vector<u64>,
    receipt_hash: option::Option<vector<u8>>,
    ctx: &mut TxContext
): (Bill, vector<Debt>) {
    let creator = ctx.sender();
    let debtor_count = debtors.length();
    
    // Validations
    assert!(total_amount > 0, errors::invalid_amount());
    assert!(
        debtor_count > 0 && debtor_count <= constants::max_participants(), 
        errors::max_participants_exceeded()
    );
    assert!(debtors.length() == amounts.length(), errors::mismatched_vectors());
    
    // Verify amounts sum to total (excluding creator)
    let mut sum = 0u64;
    let mut j = 0;
    while (j < debtor_count) {
        let debtor = *debtors.borrow(j);
        if (debtor != creator) {
            sum = sum + *amounts.borrow(j);
        };
        j = j + 1;
    };
    assert!(sum == total_amount, errors::invalid_split_amounts());
    
    let now = clock::timestamp_ms(clock);
    let grace_end = now + constants::grace_period_ms();
    
    // Create bill
    let bill = types::new_bill(
        creator,
        title,
        description,
        total_amount,
        constants::split_type_custom(),
        receipt_hash,
        now,
        grace_end,
        debtor_count as u64,
        ctx
    );
    let bill_id = types::bill_id(&bill);
    
    // Create debts with custom amounts
    let mut debts = vector::empty<Debt>();
    let mut k = 0;
    
    while (k < debtor_count) {
        let debtor = *debtors.borrow(k);
        let amount = *amounts.borrow(k);
        
        // Skip if debtor is creator or amount is 0
        if (debtor != creator && amount > 0) {
            let debt = types::new_debt(
                bill_id,
                debtor,
                creator,
                amount,
                vector::empty(),
                now,
                ctx
            );
            
            events::emit_debt_created(
                types::debt_id(&debt),
                bill_id,
                debtor,
                creator,
                amount,
                now
            );
            
            debts.push_back(debt);
        };
        
        k = k + 1;
    };
    
    // Update registry
    types::increment_registry_stats(registry, total_amount);
    
    // Emit event
    events::emit_bill_created(
        bill_id,
        creator,
        types::bill_title(&bill),
        total_amount,
        constants::split_type_custom(),
        debts.length() as u64,
        now
    );
    
    (bill, debts)
}

// ============================================================================
// DUTCH (ITEMIZED) SPLIT
// ============================================================================

/// Create a bill with Dutch (itemized) split
/// Each debtor gets assigned specific items they're responsible for
/// 
/// # Arguments
/// * `debtors` - List of debtor addresses
/// * `item_names` - Per debtor: list of item names
/// * `item_amounts` - Per debtor: list of item amounts
/// * `item_quantities` - Per debtor: list of item quantities
public fun create_dutch_split(
    registry: &mut BillRegistry,
    clock: &Clock,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    debtors: vector<address>,
    item_names: vector<vector<vector<u8>>>,
    item_amounts: vector<vector<u64>>,
    item_quantities: vector<vector<u64>>,
    receipt_hash: option::Option<vector<u8>>,
    ctx: &mut TxContext
): (Bill, vector<Debt>) {
    let creator = ctx.sender();
    let debtor_count = debtors.length();
    
    // Validations
    assert!(total_amount > 0, errors::invalid_amount());
    assert!(
        debtor_count > 0 && debtor_count <= constants::max_participants(),
        errors::max_participants_exceeded()
    );
    assert!(debtors.length() == item_names.length(), errors::mismatched_vectors());
    assert!(debtors.length() == item_amounts.length(), errors::mismatched_vectors());
    assert!(debtors.length() == item_quantities.length(), errors::mismatched_vectors());
    
    let now = clock::timestamp_ms(clock);
    let grace_end = now + constants::grace_period_ms();
    
    // Create bill
    let bill = types::new_bill(
        creator,
        title,
        description,
        total_amount,
        constants::split_type_dutch(),
        receipt_hash,
        now,
        grace_end,
        debtor_count as u64,
        ctx
    );
    let bill_id = types::bill_id(&bill);
    
    // Create debts with itemized due items
    let mut debts = vector::empty<Debt>();
    let mut j = 0;
    
    while (j < debtor_count) {
        let debtor = *debtors.borrow(j);
        let names = item_names.borrow(j);
        let amounts_list = item_amounts.borrow(j);
        let quantities = item_quantities.borrow(j);
        
        // Skip if debtor is creator
        if (debtor != creator) {
            // Build DueItems vector
            let mut due_items = vector::empty<DueItem>();
            let mut total_for_debtor = 0u64;
            let mut k = 0;
            
            while (k < names.length()) {
                let item = types::new_due_item(
                    *names.borrow(k),
                    *amounts_list.borrow(k),
                    *quantities.borrow(k)
                );
                total_for_debtor = total_for_debtor + types::due_item_total(&item);
                due_items.push_back(item);
                k = k + 1;
            };
            
            if (total_for_debtor > 0) {
                let debt = types::new_debt(
                    bill_id,
                    debtor,
                    creator,
                    total_for_debtor,
                    due_items,
                    now,
                    ctx
                );
                
                events::emit_debt_created(
                    types::debt_id(&debt),
                    bill_id,
                    debtor,
                    creator,
                    total_for_debtor,
                    now
                );
                
                debts.push_back(debt);
            };
        };
        
        j = j + 1;
    };
    
    // Update registry
    types::increment_registry_stats(registry, total_amount);
    
    // Emit event
    events::emit_bill_created(
        bill_id,
        creator,
        types::bill_title(&bill),
        total_amount,
        constants::split_type_dutch(),
        debts.length() as u64,
        now
    );
    
    (bill, debts)
}

// ============================================================================
// OBJECT TRANSFER HELPERS
// ============================================================================

/// Share bill to make it accessible to all
public fun share_bill(bill: Bill) {
    types::share_bill_object(bill);
}

/// Transfer a single debt to its debtor
public fun transfer_debt(debt: Debt) {
    types::transfer_debt_to_debtor(debt);
}

/// Transfer all debts to their respective debtors
public fun transfer_debts(mut debts: vector<Debt>) {
    while (!debts.is_empty()) {
        let debt = debts.pop_back();
        transfer_debt(debt);
    };
    debts.destroy_empty();
}
