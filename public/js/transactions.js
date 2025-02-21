document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    let transactions = [];

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    loadUserInfo();
    loadTransactions();

    async function loadUserInfo() {
        try {
            const response = await fetch('/api/auth/user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }

            const data = await response.json();
            if (data.success) {
                const userElement = document.querySelector('.user');
                userElement.textContent = `Hello, ${data.user.username}`;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('type').value;
        const amount = document.getElementById('amount').value;
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
        
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ type, amount, description, date })
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                transactionForm.reset();
                await loadTransactions();
            } else {
                throw new Error(data.error || 'Failed to add transaction');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });

    async function loadTransactions() {
        try {
            const response = await fetch('/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                transactions = data.transactions;
                renderTransactions();
            } else {
                throw new Error(data.error || 'Failed to load transactions');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }

    function renderTransactions() {
        transactionList.innerHTML = '';
        transactions.forEach(transaction => {
            const transactionElement = createTransactionElement(transaction);
            transactionList.appendChild(transactionElement);
        });
        updateTotal();
    }

    function updateTotal() {
        const total = transactions.reduce((sum, transaction) => {
            const amount = parseFloat(transaction.amount);
            return sum + (transaction.type === 'income' ? amount : -amount);
        }, 0);
        
        const totalElement = document.createElement('div');
        totalElement.className = 'expense-total';
        totalElement.innerHTML = `<strong>Balance: $${total.toFixed(2)}</strong>`;
        transactionList.appendChild(totalElement);
    }
    
    function createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.dataset.id = transaction.id;
        
        const formattedDate = new Date(transaction.date).toLocaleDateString();
        const formattedAmount = parseFloat(transaction.amount).toFixed(2);
        const isIncome = transaction.type === 'income';
        
        div.innerHTML = `
            <div class="expense-details">
                <span class="amount" style="color: ${isIncome ? 'green' : 'red'}">
                    ${isIncome ? '+' : '-'}$${formattedAmount}
                </span>
                <span class="description">${transaction.description}</span>
                <span class="date">${formattedDate}</span>
                <span class="type">${transaction.type}</span>
            </div>
            <div class="expense-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        div.querySelector('.edit-btn').addEventListener('click', () => editTransaction(transaction));
        div.querySelector('.delete-btn').addEventListener('click', () => deleteTransaction(transaction.id));
        
        return div;
    }
    
    async function editTransaction(transaction) {
        const type = prompt('Enter type (income/expense):', transaction.type);
        const amount = prompt('Enter new amount:', transaction.amount);
        const description = prompt('Enter new description:', transaction.description);
        const date = prompt('Enter new date (YYYY-MM-DD):', transaction.date.split('T')[0]);
        
        if (amount && description && type) {
            try {
                const response = await fetch(`/api/transactions/${transaction.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        type,
                        amount: parseFloat(amount), 
                        description, 
                        date: date || transaction.date 
                    })
                });
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    await loadTransactions();
                } else {
                    throw new Error(data.error || 'Failed to update transaction');
                }
            } catch (error) {
                console.error('Error:', error);
                alert(error.message);
            }
        }
    }
    
    async function deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                const response = await fetch(`/api/transactions/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    await loadTransactions();
                } else {
                    throw new Error(data.error || 'Failed to delete transaction');
                }
            } catch (error) {
                console.error('Error:', error);
                alert(error.message);
            }
        }
    }
});

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        } else {
            throw new Error(data.error || 'Failed to logout');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}