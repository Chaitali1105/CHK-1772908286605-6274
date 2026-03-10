// API Base URL
const API_URL = 'http://localhost:5000';

// Global user data
let currentUser = null;
let allResources = [];
let allBookings = [];

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

    // Set minimum date to today and maximum to Dec 31 of current year
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const maxDate = `${currentYear}-12-31`;
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.setAttribute('min', today);
        dateInput.setAttribute('max', maxDate);
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
            } else if (targetSection === 'booked-resources') {
                loadBookedResources();
            } else if (targetSection === 'campus-calendar') {
                initCalendar();
            } else if (targetSection === 'class-timetable') {
                loadTimetable();
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

        // Check date is within current year
        const bookingYear = new Date(formData.booking_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (bookingYear > currentYear) {
            showMessage(`Bookings are only allowed till 31st Dec ${currentYear}`, 'error');
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
                showBookingPopup();
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
            ${booking.status === 'pending' || booking.status === 'approved' ? `
                <div class="booking-actions">
                    <button class="btn-withdraw" onclick="withdrawBooking(${booking.id})">Withdraw Request</button>
                </div>
            ` : ''}
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
            ${booking.status === 'pending' || booking.status === 'approved' ? `
                <div class="booking-actions">
                    ${booking.status === 'pending' ? `<button class="btn btn-success" onclick="approveBooking(${booking.id})">✓ Approve</button>` : ''}
                    <button class="btn btn-danger" onclick="rejectBooking(${booking.id})">✗ Reject</button>
                    <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">🗑️ Delete</button>
                </div>
            ` : ''}
            ${booking.status === 'rejected' ? `
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
                <span class="notification-type">${{approval:'APPROVED',rejection:'REJECTED',pending:'PENDING',info:'PENDING'}[notification.type]||notification.type.toUpperCase()}</span>
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
let barChart = null;
let donutChart = null;

async function loadStatistics() {
    try {
        const [resourceRes, typeRes] = await Promise.all([
            fetch(`${API_URL}/stats/resources`),
            fetch(`${API_URL}/stats/types`)
        ]);
        const resourceData = await resourceRes.json();
        const typeData = await typeRes.json();

        if (resourceData.success) {
            displayBarChart(resourceData.stats);
        }
        if (typeData.success) {
            displayDonutChart(typeData.types);
            displaySummaryStats(typeData.summary);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

const typeColorPalette = {
    'classroom': { bg: '#4FC3F7', border: '#039BE5' },
    'lab': { bg: '#81C784', border: '#43A047' },
    'auditorium': { bg: '#B39DDB', border: '#7E57C2' },
    'sport ground': { bg: '#FFB74D', border: '#FB8C00' },
    'workshop': { bg: '#FF8A65', border: '#E64A19' },
    'meeting room': { bg: '#4DD0E1', border: '#00ACC1' }
};

function getBarColor(type) {
    return typeColorPalette[type] || { bg: '#90CAF9', border: '#42A5F5' };
}

function displayBarChart(stats) {
    if (!stats.length) return;
    const ctx = document.getElementById('statsChart');
    if (barChart) barChart.destroy();

    const colors = stats.map(s => getBarColor(s.resource_type));

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.map(s => s.resource_name),
            datasets: [{
                label: 'Bookings',
                data: stats.map(s => s.booking_count),
                backgroundColor: colors.map(c => c.bg),
                borderColor: colors.map(c => c.border),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 28
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        generateLabels: function() {
                            const seen = {};
                            return stats.filter(s => {
                                if (seen[s.resource_type]) return false;
                                seen[s.resource_type] = true;
                                return true;
                            }).map(s => ({
                                text: s.resource_type.charAt(0).toUpperCase() + s.resource_type.slice(1),
                                fillStyle: getBarColor(s.resource_type).bg,
                                strokeStyle: getBarColor(s.resource_type).border,
                                lineWidth: 2,
                                borderRadius: 3
                            }));
                        },
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e1e2f',
                    titleFont: { size: 14, weight: '600' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: function(ctx) {
                            return ` ${ctx.raw} bookings`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
                    ticks: { font: { size: 12 }, color: '#888' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 13, weight: '500' }, color: '#444' }
                }
            }
        }
    });
}

function displayDonutChart(types) {
    if (!types.length) return;
    const ctx = document.getElementById('typeChart');
    if (donutChart) donutChart.destroy();

    const total = types.reduce((sum, t) => sum + t.booking_count, 0);
    const colors = types.map(t => (typeColorPalette[t.resource_type] || { bg: '#90CAF9' }).bg);
    const borderColors = types.map(t => (typeColorPalette[t.resource_type] || { border: '#42A5F5' }).border);

    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: types.map(t => t.resource_type.charAt(0).toUpperCase() + t.resource_type.slice(1)),
            datasets: [{
                data: types.map(t => t.booking_count),
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e1e2f',
                    titleFont: { size: 14, weight: '600' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: function(ctx) {
                            const pct = Math.round((ctx.raw / total) * 100);
                            return ` ${ctx.raw} bookings (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                const cx = width / 2;
                const cy = height / 2;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.font = 'bold 32px Segoe UI';
                ctx.fillStyle = '#333';
                ctx.fillText(total, cx, cy - 14);

                ctx.font = '500 13px Segoe UI';
                ctx.fillStyle = '#888';
                ctx.fillText('TOTAL', cx, cy + 10);

                ctx.font = '400 11px Segoe UI';
                ctx.fillStyle = '#aaa';
                ctx.fillText('utilization', cx, cy + 26);
                ctx.save();
            }
        }]
    });

    // Build custom legend
    const legendEl = document.getElementById('typeLegend');
    legendEl.innerHTML = types.map(t => {
        const pct = Math.round((t.booking_count / total) * 100);
        const color = (typeColorPalette[t.resource_type] || { bg: '#90CAF9' }).bg;
        const name = t.resource_type.charAt(0).toUpperCase() + t.resource_type.slice(1);
        return `<div class="donut-legend-item">
            <span class="donut-legend-dot" style="background: ${color}"></span>
            <div class="donut-legend-info">
                <span class="donut-legend-name">${name}</span>
                <span class="donut-legend-pct">${pct}%</span>
            </div>
            <span class="donut-legend-count">${t.booking_count} bookings</span>
            <div class="donut-legend-bar"><div class="donut-legend-bar-fill" style="width: ${pct}%; background: ${color}"></div></div>
        </div>`;
    }).join('');
}

function displaySummaryStats(summary) {
    if (!summary) return;
    const el = document.getElementById('summaryStats');
    const items = [
        { icon: '📊', label: 'Total Bookings', value: summary.total_bookings, color: '#1d4ed8' },
        { icon: '✅', label: 'Approved', value: summary.approved_count, color: '#10b981' },
        { icon: '⏳', label: 'Pending', value: summary.pending_count, color: '#f59e0b' },
        { icon: '❌', label: 'Rejected', value: summary.rejected_count, color: '#ef4444' },
        { icon: '🏢', label: 'Resources Used', value: summary.unique_resources, color: '#0ea5e9' },
        { icon: '👥', label: 'Active Users', value: summary.unique_users, color: '#8b5cf6' }
    ];
    el.innerHTML = items.map(item => `
        <div class="summary-stat-card">
            <div class="summary-stat-icon" style="background: ${item.color}15; color: ${item.color}">${item.icon}</div>
            <div class="summary-stat-value" style="color: ${item.color}">${item.value || 0}</div>
            <div class="summary-stat-label">${item.label}</div>
        </div>
    `).join('');
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

function showBookingPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="popup-box">
            <div class="popup-icon">🎉</div>
            <h2 class="popup-title">Congratulations!</h2>
            <p class="popup-message">Your booking request has been submitted successfully!</p>
            <p class="popup-submsg">You will be notified once an admin reviews your request.</p>
            <button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">Got it!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('popup-show'));
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

// ============ WITHDRAW BOOKING ============
async function withdrawBooking(bookingId) {
    if (!confirm('Are you sure you want to withdraw this booking?')) return;

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/withdraw`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        const data = await response.json();

        if (data.success) {
            showWithdrawPopup();
            loadBookings();
            loadNotifications();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error withdrawing booking:', error);
        showMessage('Failed to withdraw booking', 'error');
    }
}

function showWithdrawPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="popup-box">
            <div class="popup-icon">✅</div>
            <h2 class="popup-title" style="color: #ff9800;">Booking Withdrawn</h2>
            <p class="popup-message">Your booking request has been cancelled successfully!</p>
            <p class="popup-submsg">This action has been recorded in your notifications.</p>
            <button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">Got it!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('popup-show'));
}

// ============ BOOKED RESOURCES ============
let allBookedResources = [];

async function loadBookedResources() {
    try {
        const response = await fetch(`${API_URL}/bookings/all-booked`);
        const data = await response.json();

        if (data.success) {
            allBookedResources = data.bookings;
            renderBookedResources(allBookedResources);
        }
    } catch (error) {
        console.error('Error loading booked resources:', error);
    }
}

function renderBookedResources(bookings) {
    const tbody = document.getElementById('bookedResourcesBody');
    const emptyState = document.getElementById('bookedResourcesEmpty');
    const tableWrapper = document.querySelector('.booked-resources-table-wrapper');

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '';
        tableWrapper.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableWrapper.style.display = 'block';
    emptyState.style.display = 'none';

    const typeIcons = {
        'classroom': '🏫', 'lab': '🔬', 'auditorium': '🎭',
        'sport ground': '⚽', 'workshop': '🔧', 'meeting room': '🤝'
    };

    tbody.innerHTML = bookings.map((b, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHTML(b.resource_name)}</strong></td>
            <td><span class="booked-type-badge booked-type-${b.resource_type.replace(/\s/g, '-')}">${typeIcons[b.resource_type] || '📦'} ${escapeHTML(b.resource_type)}</span></td>
            <td>${b.booking_date}</td>
            <td>${formatTime(b.start_time)} – ${formatTime(b.end_time)}</td>
            <td>${escapeHTML(b.location || 'N/A')}</td>
            <td>${escapeHTML(b.user_name)} <span class="booked-role">(${escapeHTML(b.user_role)})</span></td>
            <td class="booked-purpose">${escapeHTML(b.purpose || '—')}</td>
        </tr>
    `).join('');
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function filterBookedResources() {
    const search = (document.getElementById('bookedSearchInput').value || '').toLowerCase();
    const typeFilter = document.getElementById('bookedTypeFilter').value;

    const filtered = allBookedResources.filter(b => {
        const matchesType = typeFilter === 'all' || b.resource_type === typeFilter;
        const matchesSearch = !search ||
            b.resource_name.toLowerCase().includes(search) ||
            b.user_name.toLowerCase().includes(search) ||
            (b.location && b.location.toLowerCase().includes(search)) ||
            (b.purpose && b.purpose.toLowerCase().includes(search));
        return matchesType && matchesSearch;
    });

    renderBookedResources(filtered);
}

// Attach filter listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('bookedSearchInput');
    const typeFilter = document.getElementById('bookedTypeFilter');
    if (searchInput) searchInput.addEventListener('input', filterBookedResources);
    if (typeFilter) typeFilter.addEventListener('change', filterBookedResources);
});

// ============ CAMPUS CALENDAR ============
let campusCalendar = null;
let allCalendarEvents = [];
let calendarFilterType = 'all';

function initCalendar() {
    if (campusCalendar) {
        loadCalendarEvents();
        return;
    }

    const calendarEl = document.getElementById('campusCalendar');
    campusCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: 'auto',
        navLinks: true,
        editable: false,
        selectable: false,
        eventDisplay: 'block',
        dayMaxEvents: 3,
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        },
        eventClick: function(info) {
            info.jsEvent.preventDefault();
            showEventPopup(info.event);
        },
        eventDidMount: function(info) {
            const gradient = info.event.extendedProps.gradient;
            if (gradient) {
                info.el.style.background = gradient;
                info.el.style.border = 'none';
                info.el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
            }
            info.el.style.cursor = 'pointer';
            info.el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';

            info.el.addEventListener('mouseenter', () => {
                info.el.style.transform = 'scale(1.04)';
                info.el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                info.el.style.zIndex = '5';
                showCalendarTooltip(info.event, info.el);
            });
            info.el.addEventListener('mouseleave', () => {
                info.el.style.transform = 'scale(1)';
                info.el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                info.el.style.zIndex = '';
                hideCalendarTooltip();
            });
        },
        eventContent: function(arg) {
            const type = arg.event.extendedProps.resourceType || '';
            const typeIcons = {
                'classroom': '🏫', 'lab': '🔬', 'auditorium': '🎭',
                'sport ground': '⚽', 'workshop': '🔧', 'meeting room': '🤝'
            };
            const icon = typeIcons[type] || '📌';
            return {
                html: `<div class="fc-custom-event">
                    <span class="fc-event-icon">${icon}</span>
                    <span class="fc-event-title">${arg.event.title}</span>
                    <span class="fc-event-time">${arg.timeText}</span>
                </div>`
            };
        },
        events: []
    });

    campusCalendar.render();
    loadCalendarEvents();
    setupCalendarFilters();
}

const resourceColorMap = {
    'classroom': { bg: '#4CAF50', border: '#388E3C', gradient: 'linear-gradient(135deg, #4CAF50, #66BB6A)' },
    'lab': { bg: '#2196F3', border: '#1565C0', gradient: 'linear-gradient(135deg, #2196F3, #42A5F5)' },
    'auditorium': { bg: '#9C27B0', border: '#7B1FA2', gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)' },
    'sport ground': { bg: '#FF5722', border: '#D84315', gradient: 'linear-gradient(135deg, #FF5722, #FF8A65)' },
    'workshop': { bg: '#FF9800', border: '#EF6C00', gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)' },
    'meeting room': { bg: '#00BCD4', border: '#00838F', gradient: 'linear-gradient(135deg, #00BCD4, #4DD0E1)' }
};

const defaultColor = { bg: '#1d4ed8', border: '#1e40af', gradient: 'linear-gradient(135deg, #1d4ed8, #2563eb)' };

async function loadCalendarEvents() {
    try {
        const response = await fetch(`${API_URL}/bookings/calendar`);
        const data = await response.json();

        if (data.success) {
            allCalendarEvents = data.bookings.map(b => {
                const dateStr = b.booking_date.split('T')[0];
                const colors = resourceColorMap[b.resource_type] || defaultColor;
                return {
                    id: b.id,
                    title: `${b.resource_name}`,
                    start: `${dateStr}T${b.start_time}`,
                    end: `${dateStr}T${b.end_time}`,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    textColor: '#fff',
                    extendedProps: {
                        bookedBy: b.user_name,
                        role: b.user_role,
                        location: b.location,
                        purpose: b.purpose,
                        resourceType: b.resource_type,
                        date: dateStr,
                        startTime: b.start_time,
                        endTime: b.end_time,
                        gradient: colors.gradient
                    }
                };
            });

            applyCalendarFilter();
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

function applyCalendarFilter() {
    if (!campusCalendar) return;

    campusCalendar.removeAllEvents();

    const filtered = calendarFilterType === 'all'
        ? allCalendarEvents
        : allCalendarEvents.filter(e => e.extendedProps.resourceType === calendarFilterType);

    filtered.forEach(event => campusCalendar.addEvent(event));
}

function setupCalendarFilters() {
    const filterBtns = document.querySelectorAll('.cal-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calendarFilterType = btn.getAttribute('data-calfilter');
            applyCalendarFilter();
        });
    });
}

function showCalendarTooltip(event, el) {
    hideCalendarTooltip();
    const props = event.extendedProps;
    const tip = document.createElement('div');
    tip.className = 'cal-tooltip';
    tip.innerHTML = `<strong>${event.title}</strong><br>👤 ${props.bookedBy}<br>🕐 ${props.startTime} - ${props.endTime}<br>📍 ${props.location}`;
    document.body.appendChild(tip);
    const rect = el.getBoundingClientRect();
    tip.style.left = rect.left + rect.width / 2 - tip.offsetWidth / 2 + 'px';
    tip.style.top = rect.top - tip.offsetHeight - 8 + window.scrollY + 'px';
}

function hideCalendarTooltip() {
    document.querySelectorAll('.cal-tooltip').forEach(t => t.remove());
}

function showEventPopup(event) {
    hideCalendarTooltip();
    const props = event.extendedProps;
    const colors = resourceColorMap[props.resourceType] || defaultColor;
    const overlay = document.createElement('div');
    overlay.className = 'event-popup-overlay';
    overlay.innerHTML = `
        <div class="event-popup">
            <h3 style="border-bottom-color: ${colors.bg}">${event.title}</h3>
            <div class="event-detail"><strong>👤 Booked By:</strong><span>${props.bookedBy} (${props.role})</span></div>
            <div class="event-detail"><strong>📅 Date:</strong><span>${formatDate(props.date)}</span></div>
            <div class="event-detail"><strong>🕐 Time:</strong><span>${props.startTime} - ${props.endTime}</span></div>
            <div class="event-detail"><strong>📍 Location:</strong><span>${props.location}</span></div>
            <div class="event-detail"><strong>📝 Purpose:</strong><span>${props.purpose}</span></div>
            <button class="event-close-btn" onclick="this.closest('.event-popup-overlay').remove()">Close</button>
        </div>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
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
        const ttOverlay = document.getElementById('ttPopupOverlay');
        if (event.target === ttOverlay) {
            closeTimetablePopup();
        }
    };
});

// ============ CLASS TIMETABLE ============
let allTimetableData = [];
let timetableFiltersLoaded = false;
let ttSelectedDay = 'Monday';
let ttRoomList = [];

const TT_TIME_SLOTS = [
    { label: '09:00 - 10:00', start: '09:00:00', end: '10:00:00' },
    { label: '10:00 - 11:00', start: '10:00:00', end: '11:00:00' },
    { label: '11:00 - 12:00', start: '11:00:00', end: '12:00:00' },
    { label: '12:00 - 13:00', start: '12:00:00', end: '13:00:00' },
    { label: '14:00 - 15:00', start: '14:00:00', end: '15:00:00' },
    { label: '15:00 - 16:00', start: '15:00:00', end: '16:00:00' }
];

const TT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function loadTimetable() {
    if (!timetableFiltersLoaded) {
        await loadTimetableFilters();
        setupTimetableFilterListeners();
        setupDayTabs();
        timetableFiltersLoaded = true;
    }
    await fetchTimetableData();
}

async function loadTimetableFilters() {
    try {
        const response = await fetch(`${API_URL}/timetable/filters`);
        const data = await response.json();
        if (data.success) {
            const deptSelect = document.getElementById('ttFilterDepartment');
            const semSelect = document.getElementById('ttFilterSemester');

            ttRoomList = data.classrooms;

            data.departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                deptSelect.appendChild(opt);
            });

            data.semesters.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = 'Semester ' + s;
                semSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading timetable filters:', error);
    }
}

function setupDayTabs() {
    const container = document.getElementById('ttDayTabs');
    TT_DAYS.forEach(day => {
        const btn = document.createElement('button');
        btn.className = 'tt-day-btn' + (day === ttSelectedDay ? ' active' : '');
        btn.textContent = day.substring(0, 3);
        btn.setAttribute('data-day', day);
        btn.addEventListener('click', () => {
            ttSelectedDay = day;
            container.querySelectorAll('.tt-day-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTimetableGrid();
        });
        container.appendChild(btn);
    });
}

function setupTimetableFilterListeners() {
    document.getElementById('ttFilterDepartment').addEventListener('change', fetchTimetableData);
    document.getElementById('ttFilterSemester').addEventListener('change', fetchTimetableData);
}

async function fetchTimetableData() {
    try {
        const department = document.getElementById('ttFilterDepartment').value;
        const semester = document.getElementById('ttFilterSemester').value;

        const params = new URLSearchParams();
        if (department) params.append('department', department);
        if (semester) params.append('semester', semester);

        const response = await fetch(`${API_URL}/timetable?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            allTimetableData = data.timetable;
            renderTimetableGrid();
        }
    } catch (error) {
        console.error('Error fetching timetable:', error);
    }
}

function renderTimetableGrid() {
    const thead = document.querySelector('#timetableGrid thead tr');
    const tbody = document.getElementById('timetableBody');
    const emptyState = document.getElementById('ttEmptyState');
    const gridWrapper = document.querySelector('.tt-grid-wrapper');

    // Filter data for selected day
    const dayData = allTimetableData.filter(e => e.day === ttSelectedDay);

    if (dayData.length === 0) {
        tbody.innerHTML = '';
        gridWrapper.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    gridWrapper.style.display = 'block';
    emptyState.style.display = 'none';

    // Get rooms that have classes on this day (with current filters)
    const roomIds = [...new Set(dayData.map(e => e.resource_id))];
    const rooms = roomIds.map(id => {
        const entry = dayData.find(e => e.resource_id === id);
        return { id, name: entry.room_name };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Build header: Time Slot + one column per room
    thead.innerHTML = '<th class="tt-time-header">Time</th>' +
        rooms.map(r => `<th>${escapeHTML(r.name)}</th>`).join('');

    // Build lookup: roomId_startTime => entry
    const lookup = {};
    const spannedCells = {};

    dayData.forEach(entry => {
        const startIdx = TT_TIME_SLOTS.findIndex(s => s.start === entry.start_time);
        const endIdx = TT_TIME_SLOTS.findIndex(s => s.end === entry.end_time);
        if (startIdx === -1 || endIdx === -1) return;

        const rowspan = endIdx - startIdx + 1;
        const key = `${entry.resource_id}_${startIdx}`;
        lookup[key] = { entry, rowspan };

        for (let i = startIdx + 1; i <= endIdx; i++) {
            spannedCells[`${entry.resource_id}_${i}`] = true;
        }
    });

    let html = '';
    TT_TIME_SLOTS.forEach((slot, slotIdx) => {
        html += '<tr>';
        html += `<td class="tt-time-cell">${slot.label}</td>`;

        rooms.forEach(room => {
            const key = `${room.id}_${slotIdx}`;
            if (spannedCells[key]) return;

            const cell = lookup[key];
            if (cell) {
                const e = cell.entry;
                const rs = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';
                const tc = `tt-${e.type}`;
                html += `<td class="tt-data-cell"${rs}>
                    <div class="tt-cell-entry ${tc}" onclick='showTimetablePopup(${JSON.stringify(e).replace(/'/g, "&#39;")})'>
                        <div class="tt-cell-subject">${escapeHTML(e.subject)}</div>
                        <div class="tt-cell-faculty">${escapeHTML(e.faculty)}</div>
                        <div class="tt-cell-class">${escapeHTML(e.class_name)}</div>
                    </div>
                </td>`;
            } else {
                html += '<td class="tt-data-cell tt-empty"></td>';
            }
        });

        html += '</tr>';
    });

    tbody.innerHTML = html;
}

function showTimetablePopup(entry) {
    document.getElementById('ttPopupTitle').textContent = entry.class_name;
    document.getElementById('ttPopupSubject').textContent = entry.subject;
    document.getElementById('ttPopupFaculty').textContent = entry.faculty;
    document.getElementById('ttPopupRoom').textContent = `${entry.room_name} (${entry.building}, Floor ${entry.floor_no}, Room ${entry.room_no})`;
    document.getElementById('ttPopupTime').textContent = `${formatTimetableTime(entry.start_time)} - ${formatTimetableTime(entry.end_time)}`;
    document.getElementById('ttPopupDept').textContent = entry.department;
    document.getElementById('ttPopupSem').textContent = 'Semester ' + entry.semester;
    document.getElementById('ttPopupType').textContent = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
    document.getElementById('ttPopupOverlay').style.display = 'flex';
}

function closeTimetablePopup() {
    document.getElementById('ttPopupOverlay').style.display = 'none';
}

function resetTimetableFilters() {
    document.getElementById('ttFilterDepartment').value = '';
    document.getElementById('ttFilterSemester').value = '';
    fetchTimetableData();
}

function formatTimetableTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
}
