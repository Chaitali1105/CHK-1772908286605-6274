// API Base URL
const API_URL = 'http://localhost:5000';

// Global user data
let currentUser = null;
let allResources = [];
let allBookings = [];
let chart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(user);
    initializeDashboard();
});

// Initialize dashboard
function initializeDashboard() {
    // Set user info in header
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;

    // Handle admin-specific UI
    if (currentUser.role === 'admin') {
        // Show admin panel
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'flex';
        });
        
        // Hide user-specific sections
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'none';
        });

        // Set Available Resources as default active section for admin
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('available-resources').classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        document.querySelector('.nav-item[data-section="available-resources"]').classList.add('active');
    } else {
        // For students and faculty, set booking form defaults
        document.getElementById('bookingName').value = currentUser.name;
        document.getElementById('bookingRole').value = currentUser.role;
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.setAttribute('min', today);
    }

    // Load initial data
    loadResources();
    if (currentUser.role !== 'admin') {
        loadBookings();
    }
    loadNotifications();
    loadStatistics();

    // Setup event listeners
    setupNavigation();
    if (currentUser.role !== 'admin') {
        setupBookingForm();
        setupResourceSelector();
    }
    setupFilters();
    setupAdminTabs();

    // Auto-refresh notifications every 30 seconds
    setInterval(loadNotifications, 30000);
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.getAttribute('data-section');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');

            // Reload data if needed
            if (targetSection === 'my-bookings') {
                loadBookings();
            } else if (targetSection === 'admin-panel') {
                loadAdminBookings();
            } else if (targetSection === 'notifications') {
                loadNotifications();
            } else if (targetSection === 'statistics') {
                loadStatistics();
            }
        });
    });
}

// Setup resource selector
function setupResourceSelector() {
    const resourceSelect = document.getElementById('resourceSelect');
    resourceSelect.addEventListener('change', (e) => {
        const resourceId = e.target.value;
        if (resourceId) {
            const resource = allResources.find(r => r.id == resourceId);
            if (resource) {
                showResourceInfo(resource);
            }
        } else {
            document.getElementById('resourceInfo').style.display = 'none';
        }
    });
}

// Show resource info
function showResourceInfo(resource) {
    document.getElementById('infoBuilding').textContent = resource.building;
    document.getElementById('infoFloor').textContent = resource.floor_no;
    document.getElementById('infoRoom').textContent = resource.room_no;
    document.getElementById('infoCapacity').textContent = resource.capacity + ' people';
    document.getElementById('resourceInfo').style.display = 'block';
}

// Load resources
async function loadResources() {
    try {
        const response = await fetch(`${API_URL}/resources`);
        const data = await response.json();

        if (data.success) {
            allResources = data.resources;
            populateResourceSelector();
            displayResources(allResources);
        }
    } catch (error) {
        console.error('Error loading resources:', error);
        showMessage('Failed to load resources', 'error');
    }
}

// Populate resource selector based on user role
function populateResourceSelector() {
    const select = document.getElementById('resourceSelect');
    select.innerHTML = '<option value="">-- Select Resource --</option>';

    let filteredResources = allResources;

    // Filter based on role
    if (currentUser.role === 'student') {
        filteredResources = allResources.filter(r =>
            r.type === 'sport ground' || r.type === 'auditorium'
        );
    } else if (currentUser.role === 'faculty') {
        filteredResources = allResources.filter(r =>
            ['lab', 'classroom', 'meeting room', 'auditorium', 'workshop'].includes(r.type)
        );
    }

    filteredResources.forEach(resource => {
        const option = document.createElement('option');
        option.value = resource.id;
        option.textContent = `${resource.name} (${resource.type}) - ${resource.status}`;
        option.disabled = resource.status !== 'available';
        select.appendChild(option);
    });
}

// Display resources
function displayResources(resources) {
    const grid = document.getElementById('resourcesGrid');

    if (resources.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">🏢</div>
                <h3>No resources found</h3>
                <p>There are no resources matching your criteria</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = resources.map(resource => `
        <div class="resource-card" data-type="${resource.type}">
            <h3>${resource.name}</h3>
            <span class="resource-type">${resource.type}</span>
            <p><strong>📍 Building:</strong> ${resource.building}</p>
            <p><strong>🏢 Floor:</strong> ${resource.floor_no}</p>
            <p><strong>🚪 Room:</strong> ${resource.room_no}</p>
            <p><strong>👥 Capacity:</strong> ${resource.capacity} people</p>
            <span class="status-badge status-${resource.status}">${resource.status.toUpperCase()}</span>
        </div>
    `).join('');
}

// Setup filters
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter resources
            const filter = btn.getAttribute('data-filter');
            if (filter === 'all') {
                displayResources(allResources);
            } else {
                const filtered = allResources.filter(r => r.type === filter);
                displayResources(filtered);
            }
        });
    });
}

// Setup booking form
function setupBookingForm() {
    const form = document.getElementById('bookingForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_role: currentUser.role,
            resource_id: document.getElementById('resourceSelect').value,
            start_time: document.getElementById('startTime').value,
            end_time: document.getElementById('endTime').value,
            booking_date: document.getElementById('bookingDate').value,
            purpose: document.getElementById('purpose').value
        };

        // Validate
        if (!formData.resource_id) {
            showMessage('Please select a resource', 'error');
            return;
        }

        // Check time validity
        if (formData.start_time >= formData.end_time) {
            showMessage('End time must be after start time', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showMessage(data.message, 'success');
                form.reset();
                document.getElementById('bookingName').value = currentUser.name;
                document.getElementById('bookingRole').value = currentUser.role;
                document.getElementById('resourceInfo').style.display = 'none';
                loadNotifications();
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            showMessage('Failed to create booking', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Booking Request';
        }
    });
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch(
            `${API_URL}/bookings?user_id=${currentUser.id}&user_role=${currentUser.role}`
        );
        const data = await response.json();

        if (data.success) {
            displayMyBookings(data.bookings);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        showMessage('Failed to load bookings', 'error');
    }
}

// Display my bookings
function displayMyBookings(bookings) {
    const container = document.getElementById('myBookingsContainer');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>No bookings yet</h3>
                <p>You haven't made any bookings yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-header">
                <h3>${booking.resource_name}</h3>
                <span class="booking-status status-${booking.status}">${booking.status.toUpperCase()}</span>
            </div>
            <div class="booking-details">
                <p><strong>📅 Date:</strong> ${formatDate(booking.booking_date)}</p>
                <p><strong>🕐 Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>📍 Location:</strong> ${booking.location}</p>
                <p><strong>📝 Purpose:</strong> ${booking.purpose}</p>
            </div>
        </div>
    `).join('');
}

// Load admin bookings
async function loadAdminBookings() {
    if (currentUser.role !== 'admin') return;

    try {
        const response = await fetch(
            `${API_URL}/bookings?user_id=${currentUser.id}&user_role=admin`
        );
        const data = await response.json();

        if (data.success) {
            displayAdminBookings(data.bookings);
        }
    } catch (error) {
        console.error('Error loading admin bookings:', error);
        showMessage('Failed to load bookings', 'error');
    }
}

// Display admin bookings
function displayAdminBookings(bookings) {
    const container = document.getElementById('adminBookingsContainer');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>No bookings</h3>
                <p>There are no booking requests at the moment</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-header">
                <h3>${booking.resource_name}</h3>
                <span class="booking-status status-${booking.status}">${booking.status.toUpperCase()}</span>
            </div>
            <div class="booking-details">
                <p><strong>👤 User:</strong> ${booking.user_name} (${booking.user_role})</p>
                <p><strong>📅 Date:</strong> ${formatDate(booking.booking_date)}</p>
                <p><strong>🕐 Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>📍 Location:</strong> ${booking.location}</p>
                <p><strong>📝 Purpose:</strong> ${booking.purpose}</p>
            </div>
            ${booking.status === 'pending' ? `
                <div class="booking-actions">
                    <button class="btn btn-success" onclick="approveBooking(${booking.id})">✓ Approve</button>
                    <button class="btn btn-danger" onclick="rejectBooking(${booking.id})">✗ Reject</button>
                </div>
            ` : ''}
            ${booking.status !== 'pending' ? `
                <div class="booking-actions">
                    <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Approve booking
async function approveBooking(bookingId) {
    if (!confirm('Are you sure you want to approve this booking?')) return;

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ admin_role: currentUser.role })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            loadAdminBookings();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error approving booking:', error);
        showMessage('Failed to approve booking', 'error');
    }
}

// Reject booking
async function rejectBooking(bookingId) {
    if (!confirm('Are you sure you want to reject this booking?')) return;

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ admin_role: currentUser.role })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            loadAdminBookings();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error rejecting booking:', error);
        showMessage('Failed to reject booking', 'error');
    }
}

// Delete booking
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ admin_role: currentUser.role })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            loadAdminBookings();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showMessage('Failed to delete booking', 'error');
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications?user_id=${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayNotifications(data.notifications);
            updateNotificationBadge(data.notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsContainer');

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔔</div>
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-card ${notification.is_read ? '' : 'unread'} ${notification.type}">
            <div class="notification-header">
                <span class="notification-type">${notification.type}</span>
                <span class="notification-time">${formatDateTime(notification.created_at)}</span>
            </div>
            <div class="notification-message">${notification.message}</div>
        </div>
    `).join('');
}

// Update notification badge
function updateNotificationBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationCount');
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/stats/resources`);
        const data = await response.json();

        if (data.success) {
            displayStatistics(data.stats);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Display statistics
function displayStatistics(stats) {
    if (stats.length === 0) {
        return;
    }

    const ctx = document.getElementById('statsChart');

    // Destroy existing chart if any
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.map(s => s.resource_name),
            datasets: [{
                label: 'Number of Bookings',
                data: stats.map(s => s.booking_count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Most Booked Resources',
                    font: {
                        size: 18
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Utility functions
function showMessage(message, type = 'success') {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Setup Admin Tabs
function setupAdminTabs() {
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Update active button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show target content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');

            // Load data for the active tab
            if (targetTab === 'manage-resources') {
                loadAdminResources();
            }
        });
    });
}

// Load admin resources for management
async function loadAdminResources() {
    try {
        const response = await fetch(`${API_URL}/resources`);
        const data = await response.json();

        if (data.success) {
            displayAdminResources(data.resources);
        }
    } catch (error) {
        console.error('Error loading admin resources:', error);
        showMessage('Failed to load resources', 'error');
    }
}

// Display admin resources
function displayAdminResources(resources) {
    const container = document.getElementById('adminResourcesContainer');

    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🏢</div>
                <h3>No resources</h3>
                <p>Start by adding a new resource</p>
            </div>
        `;
        return;
    }

    container.innerHTML = resources.map(resource => `
        <div class="admin-resource-card">
            <h4>${resource.name}</h4>
            <span class="resource-type">${resource.type}</span>
            <div class="resource-details">
                <p><strong>📍 Building:</strong> ${resource.building}</p>
                <p><strong>🏢 Floor:</strong> ${resource.floor_no}</p>
                <p><strong>🚪 Room:</strong> ${resource.room_no}</p>
                <p><strong>👥 Capacity:</strong> ${resource.capacity} people</p>
                <p><strong>Status:</strong> <span class="status-badge status-${resource.status}">${resource.status.toUpperCase()}</span></p>
            </div>
            <div class="resource-actions">
                <button class="btn btn-edit" onclick="editResource(${resource.id})">✏️ Edit</button>
                <button class="btn btn-danger" onclick="deleteResource(${resource.id}, '${resource.name}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Show add resource modal
function showAddResourceModal() {
    document.getElementById('modalTitle').textContent = 'Add New Resource';
    document.getElementById('resourceForm').reset();
    document.getElementById('resourceId').value = '';
    document.getElementById('resourceModal').classList.add('show');
}

// Close resource modal
function closeResourceModal() {
    document.getElementById('resourceModal').classList.remove('show');
    document.getElementById('resourceForm').reset();
}

// Edit resource
async function editResource(resourceId) {
    try {
        const resource = allResources.find(r => r.id === resourceId);
        if (!resource) {
            showMessage('Resource not found', 'error');
            return;
        }

        // Populate form with resource data
        document.getElementById('modalTitle').textContent = 'Edit Resource';
        document.getElementById('resourceId').value = resource.id;
        document.getElementById('resourceName').value = resource.name;
        document.getElementById('resourceType').value = resource.type;
        document.getElementById('resourceBuilding').value = resource.building;
        document.getElementById('resourceFloor').value = resource.floor_no;
        document.getElementById('resourceRoom').value = resource.room_no;
        document.getElementById('resourceCapacity').value = resource.capacity;
        document.getElementById('resourceStatus').value = resource.status;

        // Show modal
        document.getElementById('resourceModal').classList.add('show');
    } catch (error) {
        console.error('Error editing resource:', error);
        showMessage('Failed to load resource data', 'error');
    }
}

// Delete resource
async function deleteResource(resourceId, resourceName) {
    if (!confirm(`Are you sure you want to delete "${resourceName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/resources/${resourceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ admin_role: currentUser.role })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            loadAdminResources();
            loadResources(); // Refresh the main resources list
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        showMessage('Failed to delete resource', 'error');
    }
}

// Setup resource form submission
document.addEventListener('DOMContentLoaded', () => {
    const resourceForm = document.getElementById('resourceForm');
    if (resourceForm) {
        resourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const resourceId = document.getElementById('resourceId').value;
            const formData = {
                name: document.getElementById('resourceName').value,
                type: document.getElementById('resourceType').value,
                building: document.getElementById('resourceBuilding').value,
                floor_no: document.getElementById('resourceFloor').value,
                room_no: document.getElementById('resourceRoom').value,
                capacity: parseInt(document.getElementById('resourceCapacity').value),
                status: document.getElementById('resourceStatus').value,
                admin_role: currentUser ? currentUser.role : 'admin'
            };

            const isEdit = resourceId !== '';
            const url = isEdit ? `${API_URL}/resources/${resourceId}` : `${API_URL}/resources`;
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    showMessage(data.message, 'success');
                    closeResourceModal();
                    loadAdminResources();
                    loadResources(); // Refresh the main resources list
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Error saving resource:', error);
                showMessage('Failed to save resource', 'error');
            }
        });
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('resourceModal');
        if (event.target === modal) {
            closeResourceModal();
        }
    };
});
