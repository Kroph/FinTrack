let transactions = [];

// Filter and sort state
let filters = {
    types: ['income', 'expense'],
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    sortBy: 'date-desc'
}

// Initialize chart controls
function initializeChartControls() {
    // Time period selector change event
    document.getElementById('time-period-selector').addEventListener('change', function() {
        const selectedPeriod = this.value;
        if (selectedPeriod === 'custom') {
            document.getElementById('custom-date-range').style.display = 'flex';
        } else {
            document.getElementById('custom-date-range').style.display = 'none';
            updateChartWithTimePeriod(selectedPeriod);
        }
    });
    
    // Custom date range apply button
    document.getElementById('apply-custom-date').addEventListener('click', function() {
        const startDate = document.getElementById('chart-date-from').value;
        const endDate = document.getElementById('chart-date-to').value;
        
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }
        
        updateChartWithCustomRange(startDate, endDate);
    });
    
    // Transaction type buttons
    document.querySelectorAll('.data-type-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.data-type-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const dataType = this.dataset.type;
            const timePeriod = document.getElementById('time-period-selector').value;
            
            if (timePeriod === 'custom') {
                const startDate = document.getElementById('chart-date-from').value;
                const endDate = document.getElementById('chart-date-to').value;
                
                if (startDate && endDate) {
                    updateChartWithCustomRange(startDate, endDate, dataType);
                }
            } else {
                updateChartWithTimePeriod(timePeriod, dataType);
            }
        });
    });
    
    // Initialize date inputs with reasonable defaults
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('chart-date-to').valueAsDate = today;
    document.getElementById('chart-date-from').valueAsDate = thirtyDaysAgo;
}

// Make these functions globally available for HTML event handlers
window.selectTransactionType = selectTransactionType;
window.selectEditType = selectEditType;
window.toggleFilterPanel = toggleFilterPanel;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.editTransaction = editTransaction;
window.closeEditModal = closeEditModal;
window.deleteTransaction = deleteTransaction;
window.loadTransactions = loadTransactions;
window.logout = logout;;

// Categories for transactions
const categories = {
    income: ['Salary', 'Gift', 'Fund'],
    expense: ['Food', 'Apartment', 'Transportation']
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication state first
    const isAuthenticated = await checkAuthState();
    
    if (!isAuthenticated) {
        return; // Stop execution if not authenticated
    }
    
    // Set default date to today
    document.getElementById('date').valueAsDate = new Date();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('username').textContent = user.username || 'User';
    
    // Populate category dropdown based on default type
    populateCategories();
    
    // Load transactions from server
    loadTransactions();
    
    // Form submission handler for adding new transactions
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    
    // Edit form submission handler
    document.getElementById('edit-form').addEventListener('submit', handleEditFormSubmit);
    
    // Initialize chart controls
    initializeChartControls();
});

async function loadTransactions() {
    const transactionList = document.getElementById('transaction-list');
    
    transactionList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading your transactions...</p>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Authentication token missing. Please log in again.');
        }
        
        console.log('Fetching transactions from server...');
        
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Server response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.transactions ? data.transactions.length : 0} transactions`);
        
        // Ensure transactions is an array, never null
        transactions = data.transactions || [];
        
        // Important: Make sure window.transactions is explicitly set
        window.transactions = transactions;
        
        console.log(`Made ${transactions.length} transactions available to charts via window.transactions`);
        
        // Update UI
        renderTransactions();
        updateBalanceSummary();
        
        // Notify charts of transaction updates
        // Use a small timeout to ensure the DOM is ready
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('transactionsUpdated'));
            console.log('Dispatched transactionsUpdated event');
        }, 100);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading transactions</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
                <button onclick="loadTransactions()" class="filter-toggle">
                    <i class="fas fa-sync"></i> Try Again
                </button>
            </div>
        `;
        
        // Make empty transactions array available for charts
        window.transactions = [];
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('transactionsUpdated'));
        }, 100);
    }
}

// Also fix the handleTransactionSubmit function to update window.transactions
// Add these lines after updating the local transactions array:

// Updated handleTransactionSubmit function (partial)
transactions.unshift(data.transaction);

// Important: Keep window.transactions and local transactions in sync
window.transactions = transactions;
console.log('Updated window.transactions with new transaction');

// Same for handleEditFormSubmit:
// After updating local transactions array:
window.transactions = transactions;
console.log('Updated window.transactions after editing transaction');

// And for deleteTransaction:
// After filtering transactions:
window.transactions = transactions;
console.log('Updated window.transactions after deleting transaction');

// Handle new transaction form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('transaction-type').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    
    // Show submitting status
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Create transaction payload exactly matching server expectations
        const transactionData = {
            amount,
            description,
            date,
            type,
            category
        };
        
        console.log('Sending transaction data:', transactionData);
        
        // Send transaction to server
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
        });
        
        // Log the full response for debugging
        console.log('Server response status:', response.status);
        const data = await response.json();
        console.log('Server response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save transaction');
        }
        
        // Add to local transactions array for immediate display
        transactions.unshift(data.transaction);
        
        // Update global transactions for charts
        window.transactions = transactions;
        
        // Clear form
        e.target.reset();
        document.getElementById('date').valueAsDate = new Date();
        populateCategories(); // Reset categories dropdown
        
        // Update UI
        renderTransactions();
        updateBalanceSummary();
        
        // Notify chart of transaction updates
        window.dispatchEvent(new Event('transactionsUpdated'));
        
        // Show success message
        alert('Transaction saved successfully!');
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert(`Failed to save transaction: ${error.message}`);
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Handle edit form submission
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('edit-type').value;
    const category = document.getElementById('edit-category').value;
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const description = document.getElementById('edit-description').value;
    const date = document.getElementById('edit-date').value;
    
    // Get transaction ID
    const transactionId = parseInt(document.getElementById('edit-form').dataset.id);
    
    try {
        const token = localStorage.getItem('token');
        
        // Update transaction on server
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type,
                category,
                amount,
                description,
                date
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update transaction');
        }
        
        const data = await response.json();
        
        // Update in local array
        const index = transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            transactions[index] = data.transaction;
        }
        
        // Update global transactions for charts
        window.transactions = transactions;
        
        // Update UI
        renderTransactions();
        updateBalanceSummary();
        closeEditModal();
        
        // Notify chart of transaction updates
        window.dispatchEvent(new Event('transactionsUpdated'));
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Failed to update transaction. Please try again.');
    }
}

// Category population functions
function populateCategories(type = 'income') {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '';
    
    categories[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

function populateEditCategories(type) {
    const categorySelect = document.getElementById('edit-category');
    categorySelect.innerHTML = '';
    
    categories[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Type selection functions
function selectTransactionType(type) {
    document.getElementById('transaction-type').value = type;
    
    if (type === 'income') {
        document.getElementById('income-btn').classList.add('active');
        document.getElementById('expense-btn').classList.remove('active');
    } else {
        document.getElementById('income-btn').classList.remove('active');
        document.getElementById('expense-btn').classList.add('active');
    }
    
    populateCategories(type);
}

function selectEditType(type) {
    document.getElementById('edit-type').value = type;
    
    if (type === 'income') {
        document.getElementById('edit-income-btn').classList.add('active');
        document.getElementById('edit-expense-btn').classList.remove('active');
    } else {
        document.getElementById('edit-income-btn').classList.remove('active');
        document.getElementById('edit-expense-btn').classList.add('active');
    }
    
    populateEditCategories(type);
}

// Filter functions
function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function applyFilters() {
    // Update filters object
    filters.types = [];
    if (document.getElementById('filter-income').checked) {
        filters.types.push('income');
    }
    if (document.getElementById('filter-expense').checked) {
        filters.types.push('expense');
    }
    
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const amountMin = document.getElementById('filter-amount-min').value;
    const amountMax = document.getElementById('filter-amount-max').value;
    
    filters.dateFrom = dateFrom ? new Date(dateFrom) : null;
    filters.dateTo = dateTo ? new Date(dateTo) : null;
    filters.amountMin = amountMin ? parseFloat(amountMin) : null;
    filters.amountMax = amountMax ? parseFloat(amountMax) : null;
    filters.sortBy = document.getElementById('sort-by').value;
    
    // Re-render transactions with filters
    renderTransactions();
    
    // Hide filter panel
    toggleFilterPanel();
}

function resetFilters() {
    document.getElementById('filter-income').checked = true;
    document.getElementById('filter-expense').checked = true;
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-amount-min').value = '';
    document.getElementById('filter-amount-max').value = '';
    document.getElementById('sort-by').value = 'date-desc';
    
    filters = {
        types: ['income', 'expense'],
        dateFrom: null,
        dateTo: null,
        amountMin: null,
        amountMax: null,
        sortBy: 'date-desc'
    };
    
    renderTransactions();
}

// Render transactions to the UI
function renderTransactions() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    // Apply current filters
    const filteredTransactions = transactions.filter(transaction => {
        // Filter by type
        if (!filters.types.includes(transaction.type)) {
            return false;
        }
        
        // Filter by date range
        if (filters.dateFrom && new Date(transaction.date) < filters.dateFrom) {
            return false;
        }
        
        if (filters.dateTo && new Date(transaction.date) > filters.dateTo) {
            return false;
        }
        
        // Filter by amount range
        if (filters.amountMin !== null && transaction.amount < filters.amountMin) {
            return false;
        }
        
        if (filters.amountMax !== null && transaction.amount > filters.amountMax) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (filters.sortBy === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (filters.sortBy === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (filters.sortBy === 'amount-desc') {
            return b.amount - a.amount;
        } else if (filters.sortBy === 'amount-asc') {
            return a.amount - b.amount;
        }
        return 0;
    });
    
    if (sortedTransactions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No transactions found</h3>
                <p>Try adjusting your filters or add a new transaction</p>
            </div>
        `;
        return;
    }
    
    // Group transactions by date
    const groupedByDate = {};
    sortedTransactions.forEach(transaction => {
        const date = transaction.date;
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(transaction);
    });
    
    // Render transactions grouped by date
    Object.keys(groupedByDate).sort((a, b) => {
        // Sort dates in descending order
        if (filters.sortBy === 'date-asc') {
            return new Date(a) - new Date(b);
        }
        return new Date(b) - new Date(a);
    }).forEach(date => {
        const transactions = groupedByDate[date];
        const dateTotal = calculateDateTotal(transactions);
        
        // Create date divider
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        dateDivider.innerHTML = `
            <span>${formatDateHeader(date)}</span>
            <span class="date-total">${formatCurrency(Math.abs(dateTotal))} ${dateTotal < 0 ? 'spent' : 'earned'}</span>
        `;
        list.appendChild(dateDivider);
        
        // Add transactions for this date
        transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            const iconClass = transaction.type === 'income' ? 'icon-income' : 'icon-expense';
            const amountClass = transaction.type === 'income' ? 'amount-income' : 'amount-expense';
            const icon = transaction.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
            
            transactionItem.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-description">${transaction.description}</div>
                        <span class="transaction-category">${transaction.category || 'Uncategorized'}</span>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="btn-edit" onclick="editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            list.appendChild(transactionItem);
        });
    });
}

function calculateDateTotal(transactions) {
    let total = 0;
    transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount) || 0;
        
        if (transaction.type === 'income') {
            total += amount;
        } else {
            total -= amount;
        }
    });
    return total;
}

function formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return formatDate(dateString);
    }
}

function updateBalanceSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const balance = totalIncome - totalExpenses;
    
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    
    // Show balance with appropriate color for gains/losses
    const balanceElement = document.getElementById('total-balance');
    balanceElement.textContent = formatCurrency(Math.abs(balance));
    
    if (balance < 0) {
        balanceElement.textContent = "-" + balanceElement.textContent;
        balanceElement.style.color = "#e74c3c";
    } else {
        balanceElement.style.color = "white";
    }
}

function formatCurrency(amount) {
    return `${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Transaction edit functions
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction) {
        // Set transaction type
        selectEditType(transaction.type);
        
        // Populate form fields
        document.getElementById('edit-amount').value = transaction.amount;
        document.getElementById('edit-description').value = transaction.description;
        document.getElementById('edit-date').value = transaction.date;
        
        // Set transaction ID on form
        document.getElementById('edit-form').dataset.id = id;
        
        // Fill categories dropdown and select the right one
        populateEditCategories(transaction.type);
        document.getElementById('edit-category').value = transaction.category;
        
        // Show modal
        document.getElementById('editModal').style.display = 'block';
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Delete transaction function
async function deleteTransaction(id) {
    try {
        const token = localStorage.getItem('token');
        
        // Delete transaction from server
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete transaction');
        }
        
        // Remove from local array
        transactions = transactions.filter(t => t.id !== id);
        
        // Update global transactions for charts
        window.transactions = transactions;
        
        // Update UI
        renderTransactions();
        updateBalanceSummary();
        
        // Notify chart of transaction updates
        window.dispatchEvent(new Event('transactionsUpdated'));
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction. Please try again.');
    }
}