// Create global transactions variable if it doesn't exist
window.transactions = window.transactions || [];

// Function to ensure transactions data is accessible to charts
function ensureTransactionsAccessible() {
  // Make sure the transactions array is available in the window scope
  if (transactions && transactions.length > 0 && (!window.transactions || window.transactions.length === 0)) {
    window.transactions = transactions;
    console.log('Copied transactions to window scope for chart access');
  }
}

// Load transactions with improved chart support
async function loadTransactionsWithChartSupport() {
  const transactionList = document.getElementById('transaction-list');
  
  // Show loading indicator
  transactionList.innerHTML = `
    <div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-light);">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
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
    
    // Replace local transactions array with server data
    transactions = data.transactions || [];
    
    // Ensure it's also available in window scope for charts
    window.transactions = transactions;
    
    // Update UI
    renderTransactions();
    updateBalanceSummary();
    
    // Explicitly notify chart of transaction updates
    window.dispatchEvent(new Event('transactionsUpdated'));
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    transactionList.innerHTML = `
      <div class="empty-state" style="padding: 2rem; text-align: center; color: var(--danger);">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
        <p>Error loading transactions</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
        <button onclick="loadTransactionsWithChartSupport()" class="filter-toggle" style="margin-top: 1rem;">
          <i class="fas fa-sync"></i> Try Again
        </button>
      </div>
    `;
    
    // Initialize empty chart even on error
    window.transactions = [];
    window.dispatchEvent(new Event('transactionsUpdated'));
  }
}

// Override the original loadTransactions function 
document.addEventListener('DOMContentLoaded', function() {
  // Store the original function reference
  const originalLoadTransactions = window.loadTransactions;
  
  // Replace with our enhanced version
  window.loadTransactions = loadTransactionsWithChartSupport;
  
  // Make sure transactions are accessible 
  setInterval(ensureTransactionsAccessible, 1000);
  
  // Make sure transaction form updates trigger chart refresh
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      // After form submission completes successfully, trigger chart update
      setTimeout(() => {
        if (window.transactions) {
          console.log('Transaction added, updating charts');
          window.dispatchEvent(new Event('transactionsUpdated'));
        }
      }, 1000);
    });
  }
});