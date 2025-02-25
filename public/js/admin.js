let selectedUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin dashboard initializing...');
    
    // Check if user is authorized
    const isAdmin = await checkAdminAuth();
    
    if (isAdmin) {
        console.log('Admin authentication successful');
        // Load users
        loadUsers();
    } else {
        console.log('Not authorized as admin');
    }
});

// Check if the current user has admin privileges
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        // First check if the user is authenticated
        const response = await fetch('/api/auth/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        // Now check if user is admin by directly fetching admin data
        const adminCheckResponse = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (adminCheckResponse.status === 403) {
            // User is not an admin
            window.location.href = '/home.html';
            return false;
        }
        
        if (!adminCheckResponse.ok) {
            console.error('Admin check error:', adminCheckResponse.status);
            throw new Error('Failed to check admin status');
        }
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return false;
    }
}

// Load all users
async function loadUsers() {
    const token = localStorage.getItem('token');
    const userList = document.getElementById('userList');
    
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        
        if (data.users.length === 0) {
            userList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No users found</h3>
                    <p>There are no registered users yet.</p>
                </div>
            `;
            return;
        }
        
        userList.innerHTML = '';
        
        data.users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            
            const userRole = user.is_admin ? 
                '<span class="user-role role-admin">Admin</span>' : 
                '<span class="user-role role-user">User</span>';
            
            // Format created date
            const createdDate = new Date(user.created_at).toLocaleDateString();
            
            // Admin actions based on user role
            let actionButtons = `
                <button class="action-btn delete-btn" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
            
            userCard.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-email">${user.email}</div>
                    ${userRole}
                    <div class="user-date">Joined: ${createdDate}</div>
                </div>
                <div class="user-actions">
                    ${actionButtons}
                </div>
            `;
            
            userList.appendChild(userCard);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        userList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading users</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Search users by term
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const token = localStorage.getItem('token');
    const userList = document.getElementById('userList');
    
    if (!searchTerm) {
        loadUsers();
        return;
    }
    
    console.log('Searching for users with term:', searchTerm);
    
    fetch(`/api/admin/users/search?term=${encodeURIComponent(searchTerm)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        console.log('Search API Response status:', response.status);
        
        if (!response.ok) {
            return response.json().catch(() => {
                throw new Error(`Search failed (${response.status})`);
            }).then(errorData => {
                throw new Error(`Search failed: ${errorData.error || ''}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Search results:', data);
        
        if (!data.users || data.users.length === 0) {
            userList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No users found</h3>
                    <p>No users match your search term: "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        userList.innerHTML = '';
        
        data.users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            
            const userRole = user.is_admin ? 
                '<span class="user-role role-admin">Admin</span>' : 
                '<span class="user-role role-user">User</span>';
            
            const createdDate = new Date(user.created_at).toLocaleDateString();
            
            // Admin actions based on user role
            let actionButtons = `
                <button class="action-btn delete-btn" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
            
            userCard.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-email">${user.email}</div>
                    ${userRole}
                    <div class="user-date">Joined: ${createdDate}</div>
                </div>
                <div class="user-actions">
                    ${actionButtons}
                </div>
            `;
            
            userList.appendChild(userCard);
        });
    })
    .catch(error => {
        console.error('Search error:', error);
        userList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error searching users</h3>
                <p>${error.message}</p>
            </div>
        `;
    });
}

// Delete a user
async function deleteUser(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Delete user error:', error);
        alert(`Error deleting user: ${error.message}`);
    }
}

// Promote a user to admin
async function promoteToAdmin(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/promote`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to promote user');
        }
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Promote user error:', error);
        alert(`Error promoting user: ${error.message}`);
    }
}

// Revoke admin privileges
async function revokeAdmin(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/revoke`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to revoke admin privileges');
        }
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Revoke admin error:', error);
        alert(`Error revoking admin privileges: ${error.message}`);
    }
}