document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    loadUsers();
});

let selectedUserId = null;

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
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
            displayUsers(data.users);
        } else {
            throw new Error(data.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function displayUsers(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-info">
                <strong>${user.username}</strong>
                <div>${user.email}</div>
            </div>
            <div class="user-actions">
                <button onclick="showDeleteConfirmation(${user.id})" class="delete-btn">Delete Account</button>
            </div>
        `;
        userList.appendChild(userElement);
    });
}

function showDeleteConfirmation(userId) {
    selectedUserId = userId;
    document.getElementById('confirmModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    selectedUserId = null;
}

async function confirmDelete() {
    if (!selectedUserId) return;

    try {
        const response = await fetch(`/api/admin/users/${selectedUserId}`, {
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
            closeModal();
            await loadUsers();
        } else {
            throw new Error(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

async function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value;
    
    try {
        const response = await fetch(`/api/admin/users/search?term=${encodeURIComponent(searchTerm)}`, {
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
            displayUsers(data.users);
        } else {
            throw new Error(data.error || 'Failed to search users');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

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