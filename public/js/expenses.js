document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.getElementById('expense-form');
    const expenseList = document.getElementById('expense-list');
    let expenses = [];

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    loadExpenses();

    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
        
        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ amount, description, date })
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                expenseForm.reset();
                await loadExpenses();
            } else {
                throw new Error(data.error || 'Failed to add expense');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });

    async function loadExpenses() {
        try {
            const response = await fetch('/api/expenses', {
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
                expenses = data.expenses;
                renderExpenses();
            } else {
                throw new Error(data.error || 'Failed to load expenses');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }

    function renderExpenses() {
        expenseList.innerHTML = '';
        expenses.forEach(expense => {
            const expenseElement = createExpenseElement(expense);
            expenseList.appendChild(expenseElement);
        });
        updateTotal();
    }

    function updateTotal() {
        const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const totalElement = document.createElement('div');
        totalElement.className = 'expense-total';
        totalElement.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
        expenseList.appendChild(totalElement);
    }
    
    function createExpenseElement(expense) {
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.dataset.id = expense.id;
        
        const formattedDate = new Date(expense.date).toLocaleDateString();
        const formattedAmount = parseFloat(expense.amount).toFixed(2);
        
        div.innerHTML = `
            <div class="expense-details">
                <span class="amount">$${formattedAmount}</span>
                <span class="description">${expense.description}</span>
                <span class="date">${formattedDate}</span>
            </div>
            <div class="expense-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        div.querySelector('.edit-btn').addEventListener('click', () => editExpense(expense));
        div.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(expense.id));
        
        return div;
    }
    
    async function editExpense(expense) {
        const amount = prompt('Enter new amount:', expense.amount);
        const description = prompt('Enter new description:', expense.description);
        const date = prompt('Enter new date (YYYY-MM-DD):', expense.date.split('T')[0]);
        
        if (amount && description) {
            try {
                const response = await fetch(`/api/expenses/${expense.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        amount: parseFloat(amount), 
                        description, 
                        date: date || expense.date 
                    })
                });
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    await loadExpenses();
                } else {
                    throw new Error(data.error || 'Failed to update expense');
                }
            } catch (error) {
                console.error('Error:', error);
                alert(error.message);
            }
        }
    }
    
    async function deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            try {
                const response = await fetch(`/api/expenses/${id}`, {
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
                    await loadExpenses();
                } else {
                    throw new Error(data.error || 'Failed to delete expense');
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