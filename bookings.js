const express = require('express');
const db = require('../db');

const router = express.Router();

// Helper to format dates nicely for notifications
function formatDate(dateVal) {
    const d = new Date(dateVal);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Get all resources
router.get('/resources', async (req, res) => {
    try {
        const [resources] = await db.query(
            'SELECT * FROM resources ORDER BY type, name'
        );
        res.json({ success: true, resources });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get available resources
router.get('/resources/available', async (req, res) => {
    try {
        const [resources] = await db.query(
            "SELECT * FROM resources WHERE status = 'available' ORDER BY type, name"
        );
        res.json({ success: true, resources });
    } catch (error) {
        console.error('Error fetching available resources:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check slot availability and suggest alternatives
router.get('/bookings/check-availability', async (req, res) => {
    try {
        const { resource_id, booking_date, start_time, end_time } = req.query;

        if (!resource_id || !booking_date || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'resource_id, booking_date, start_time, end_time are required' });
        }

        // Check for conflicting bookings on the requested slot
        const [conflicts] = await db.query(
            `SELECT id, resource_name, user_name, user_role, start_time, end_time, status
             FROM bookings
             WHERE resource_id = ?
             AND booking_date = ?
             AND status IN ('pending', 'approved')
             AND (
                 (start_time <= ? AND end_time > ?) OR
                 (start_time < ? AND end_time >= ?) OR
                 (start_time >= ? AND end_time <= ?)
             )
             ORDER BY start_time ASC`,
            [resource_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        const isAvailable = conflicts.length === 0;

        // Fetch all booked slots for this resource on this date
        const [dayBookings] = await db.query(
            `SELECT start_time, end_time, status, user_name, user_role
             FROM bookings
             WHERE resource_id = ? AND booking_date = ? AND status IN ('pending', 'approved')
             ORDER BY start_time ASC`,
            [resource_id, booking_date]
        );

        // Calculate suggested alternative slots
        const suggestions = [];
        const requestedDuration = timeToMinutes(end_time) - timeToMinutes(start_time);
        if (requestedDuration <= 0) {
            return res.json({ success: true, available: false, conflicts: [], suggestions: [], dayBookings: [] });
        }

        // Campus operating hours: 7:00 AM to 10:00 PM
        const dayStart = 7 * 60;  // 420 min
        const dayEnd = 22 * 60;   // 1320 min

        // Build occupied intervals (merge overlapping)
        const occupied = dayBookings.map(b => ({
            start: timeToMinutes(b.start_time),
            end: timeToMinutes(b.end_time)
        })).sort((a, b) => a.start - b.start);

        const merged = [];
        for (const interval of occupied) {
            if (merged.length && interval.start <= merged[merged.length - 1].end) {
                merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
            } else {
                merged.push({ ...interval });
            }
        }

        // Find free gaps
        let cursor = dayStart;
        for (const block of merged) {
            if (block.start > cursor) {
                const gapLen = block.start - cursor;
                if (gapLen >= requestedDuration) {
                    suggestions.push({
                        start_time: minutesToTime(cursor),
                        end_time: minutesToTime(cursor + requestedDuration)
                    });
                }
            }
            cursor = Math.max(cursor, block.end);
        }
        // Gap after last booking to end of day
        if (dayEnd > cursor && (dayEnd - cursor) >= requestedDuration) {
            suggestions.push({
                start_time: minutesToTime(cursor),
                end_time: minutesToTime(cursor + requestedDuration)
            });
        }

        // Limit to 5 suggestions
        res.json({
            success: true,
            available: isAvailable,
            conflicts,
            suggestions: suggestions.slice(0, 5),
            dayBookings
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get conflict recommendations for admin
router.get('/bookings/conflict-check/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Get the booking in question
        const [bookings] = await db.query(
            `SELECT *, DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date FROM bookings WHERE id = ?`,
            [bookingId]
        );
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        const booking = bookings[0];

        // Find overlapping bookings for same resource/date (excluding this one)
        const [overlapping] = await db.query(
            `SELECT id, user_name, user_role, start_time, end_time, status,
                    DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date
             FROM bookings
             WHERE resource_id = ? AND booking_date = ? AND id != ? AND status IN ('pending', 'approved')
             AND (
                 (start_time <= ? AND end_time > ?) OR
                 (start_time < ? AND end_time >= ?) OR
                 (start_time >= ? AND end_time <= ?)
             )
             ORDER BY start_time ASC`,
            [booking.resource_id, booking.booking_date,
             bookingId,
             booking.start_time, booking.start_time,
             booking.end_time, booking.end_time,
             booking.start_time, booking.end_time]
        );

        // Suggest alternative slots on same date
        const [dayBookings] = await db.query(
            `SELECT start_time, end_time FROM bookings
             WHERE resource_id = ? AND booking_date = ? AND status IN ('pending', 'approved') AND id != ?
             ORDER BY start_time ASC`,
            [booking.resource_id, booking.booking_date, bookingId]
        );

        const requestedDuration = timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time);
        const dayStart = 7 * 60;
        const dayEnd = 22 * 60;

        const occupied = dayBookings.map(b => ({
            start: timeToMinutes(b.start_time),
            end: timeToMinutes(b.end_time)
        })).sort((a, b) => a.start - b.start);

        const merged = [];
        for (const interval of occupied) {
            if (merged.length && interval.start <= merged[merged.length - 1].end) {
                merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
            } else {
                merged.push({ ...interval });
            }
        }

        const suggestions = [];
        let cursor = dayStart;
        for (const block of merged) {
            if (block.start > cursor && (block.start - cursor) >= requestedDuration) {
                suggestions.push({
                    start_time: minutesToTime(cursor),
                    end_time: minutesToTime(cursor + requestedDuration)
                });
            }
            cursor = Math.max(cursor, block.end);
        }
        if (dayEnd > cursor && (dayEnd - cursor) >= requestedDuration) {
            suggestions.push({
                start_time: minutesToTime(cursor),
                end_time: minutesToTime(cursor + requestedDuration)
            });
        }

        res.json({
            success: true,
            hasConflicts: overlapping.length > 0,
            overlapping,
            suggestions: suggestions.slice(0, 5)
        });
    } catch (error) {
        console.error('Error checking conflicts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Helper: convert "HH:MM:SS" or "HH:MM" to minutes
function timeToMinutes(t) {
    const parts = t.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Helper: convert minutes to "HH:MM"
function minutesToTime(m) {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
}

// Create a booking with ACID transaction support
router.post('/bookings', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const {
            user_id, user_name, user_role, resource_id,
            start_time, end_time, booking_date, purpose
        } = req.body;

        // Validate required fields
        if (!user_id || !resource_id || !start_time || !end_time || !booking_date || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate booking date is within current year
        const bookingYear = new Date(booking_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (bookingYear > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Bookings are only allowed till 31st Dec ${currentYear}`
            });
        }

        // START TRANSACTION - ACID Property: Atomicity
        await connection.beginTransaction();

        // Get resource details with row lock to prevent concurrent modifications
        // ACID Property: Isolation - using FOR UPDATE lock
        const [resources] = await connection.query(
            'SELECT * FROM resources WHERE id = ? FOR UPDATE',
            [resource_id]
        );

        if (resources.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        const resource = resources[0];

        // Check permissions based on role
        const studentAllowed = ['sport ground', 'auditorium'];
        const teacherAllowed = ['lab', 'classroom', 'meeting room', 'auditorium', 'workshop'];

        if (user_role === 'student' && !studentAllowed.includes(resource.type)) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: `Students can only book: ${studentAllowed.join(', ')}`
            });
        }

        if (user_role === 'faculty' && !teacherAllowed.includes(resource.type)) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to book this resource'
            });
        }

        // Check for conflicting bookings with row lock
        // ACID Property: Consistency - ensuring no double bookings
        const [conflicts] = await connection.query(
            `SELECT id FROM bookings 
             WHERE resource_id = ? 
             AND booking_date = ? 
             AND status IN ('pending', 'approved')
             AND (
                 (start_time <= ? AND end_time > ?) OR
                 (start_time < ? AND end_time >= ?) OR
                 (start_time >= ? AND end_time <= ?)
             )
             FOR UPDATE`,
            [resource_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (conflicts.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'This resource is already booked for the selected time slot. Please choose a different time.'
            });
        }

        // Create location string
        const location = `${resource.building}, Floor ${resource.floor_no}, Room ${resource.room_no}`;

        // Insert booking
        const [result] = await connection.query(
            `INSERT INTO bookings 
             (user_id, user_name, user_role, resource_id, resource_name, resource_type, 
              start_time, end_time, booking_date, purpose, location, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, user_name, user_role, resource_id, resource.name, resource.type,
             start_time, end_time, booking_date, purpose, location, 'pending']
        );

        // Create notification for user
        await connection.query(
            `INSERT INTO notifications (user_id, message, type) 
             VALUES (?, ?, ?)`,
            [user_id, `Your booking request for ${resource.name} has been submitted and is pending approval.`, 'info']
        );

        // COMMIT TRANSACTION - ACID Property: Durability
        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Booking request submitted successfully',
            booking_id: result.insertId
        });

    } catch (error) {
        // ROLLBACK on error - ACID Property: Atomicity
        if (connection) {
            await connection.rollback();
        }
        console.error('Error creating booking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again.' 
        });
    } finally {
        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
});

// Get bookings (all for admin, own for users)
router.get('/bookings', async (req, res) => {
    try {
        const { user_id, user_role } = req.query;

        let query;
        let params;

        if (user_role === 'admin') {
            // Admin sees all bookings
            query = "SELECT *, DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date FROM bookings ORDER BY created_at DESC";
            params = [];
        } else {
            // Users see only their bookings
            query = "SELECT *, DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
            params = [user_id];
        }

        const [bookings] = await db.query(query, params);
        res.json({ success: true, bookings });

    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Approve booking (admin only)
router.put('/bookings/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_role } = req.body;

        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can approve bookings'
            });
        }

        // Get booking details
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookings[0];

        // Update booking status
        await db.query(
            "UPDATE bookings SET status = 'approved' WHERE id = ?",
            [id]
        );

        // Set resource as occupied
        await db.query(
            "UPDATE resources SET status = 'occupied' WHERE id = ?",
            [booking.resource_id]
        );

        // Create notification for user
        await db.query(
            `INSERT INTO notifications (user_id, message, type) 
             VALUES (?, ?, ?)`,
            [booking.user_id, 
             `Your booking for ${booking.resource_name} on ${formatDate(booking.booking_date)} has been APPROVED.`, 
             'approval']
        );

        res.json({
            success: true,
            message: 'Booking approved successfully'
        });

    } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Reject booking (admin only)
router.put('/bookings/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_role } = req.body;

        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can reject bookings'
            });
        }

        // Get booking details
        const [bookings] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookings[0];

        if (booking.status !== 'pending' && booking.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only pending or approved bookings can be rejected'
            });
        }

        const wasApproved = booking.status === 'approved';

        // Update booking status
        await db.query(
            "UPDATE bookings SET status = 'rejected' WHERE id = ?",
            [id]
        );

        // Set resource back to available
        await db.query(
            "UPDATE resources SET status = 'available' WHERE id = ?",
            [booking.resource_id]
        );

        // Create notification for user
        await db.query(
            `INSERT INTO notifications (user_id, message, type) 
             VALUES (?, ?, ?)`,
            [booking.user_id, 
             `Your booking for ${booking.resource_name} on ${formatDate(booking.booking_date)} has been REJECTED by admin.`, 
             'rejection']
        );

        res.json({
            success: true,
            message: 'Booking rejected successfully'
        });

    } catch (error) {
        console.error('Error rejecting booking:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete booking (admin only)
router.delete('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_role } = req.body;

        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete bookings'
            });
        }

        await db.query('DELETE FROM bookings WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get notifications
router.get('/notifications', async (req, res) => {
    try {
        const { user_id } = req.query;

        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [user_id]
        );

        res.json({ success: true, notifications });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [id]
        );

        res.json({ success: true, message: 'Notification marked as read' });

    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get resource usage statistics
router.get('/stats/resources', async (req, res) => {
    try {
        const [stats] = await db.query(
            `SELECT resource_name, resource_type, COUNT(*) as booking_count 
             FROM bookings 
             WHERE status IN ('approved', 'pending')
             GROUP BY resource_name, resource_type
             ORDER BY booking_count DESC 
             LIMIT 8`
        );

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get resource utilization by type (for donut chart)
router.get('/stats/types', async (req, res) => {
    try {
        const [types] = await db.query(
            `SELECT resource_type, COUNT(*) as booking_count 
             FROM bookings 
             WHERE status IN ('approved', 'pending')
             GROUP BY resource_type 
             ORDER BY booking_count DESC`
        );

        const [summary] = await db.query(
            `SELECT 
                COUNT(*) as total_bookings,
                COUNT(DISTINCT resource_name) as unique_resources,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
             FROM bookings`
        );

        res.json({ success: true, types, summary: summary[0] });

    } catch (error) {
        console.error('Error fetching type stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Add new resource
router.post('/resources', async (req, res) => {
    try {
        const { name, type, building, floor_no, room_no, capacity, status, admin_role } = req.body;

        // Validate admin role
        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can add resources'
            });
        }

        // Validate required fields
        if (!name || !type || !building || !floor_no || !room_no || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate resource type
        const validTypes = ['classroom', 'lab', 'auditorium', 'sport ground', 'workshop', 'meeting room'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resource type'
            });
        }

        // Insert resource
        await db.query(
            `INSERT INTO resources (name, type, building, floor_no, room_no, capacity, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, building, floor_no, room_no, capacity, status || 'available']
        );

        res.status(201).json({
            success: true,
            message: 'Resource added successfully'
        });

    } catch (error) {
        console.error('Error adding resource:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Update resource
router.put('/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, building, floor_no, room_no, capacity, status, admin_role } = req.body;

        // Validate admin role
        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can update resources'
            });
        }

        // Validate required fields
        if (!name || !type || !building || !floor_no || !room_no || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate resource type
        const validTypes = ['classroom', 'lab', 'auditorium', 'sport ground', 'workshop', 'meeting room'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resource type'
            });
        }

        // Check if resource exists
        const [resources] = await db.query('SELECT id FROM resources WHERE id = ?', [id]);
        if (resources.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Update resource
        await db.query(
            `UPDATE resources 
             SET name = ?, type = ?, building = ?, floor_no = ?, room_no = ?, capacity = ?, status = ?
             WHERE id = ?`,
            [name, type, building, floor_no, room_no, capacity, status, id]
        );

        res.json({
            success: true,
            message: 'Resource updated successfully'
        });

    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Delete resource
router.delete('/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_role } = req.body;

        // Validate admin role
        if (admin_role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete resources'
            });
        }

        // Check if resource exists
        const [resources] = await db.query('SELECT name FROM resources WHERE id = ?', [id]);
        if (resources.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Check if resource has any bookings
        const [bookings] = await db.query(
            'SELECT COUNT(*) as count FROM bookings WHERE resource_id = ?',
            [id]
        );

        if (bookings[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete resource with existing bookings. Please delete all bookings first.'
            });
        }

        // Delete resource
        await db.query('DELETE FROM resources WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all approved bookings (read-only, visible to all roles)
router.get('/bookings/all-booked', async (req, res) => {
    try {
        const [bookings] = await db.query(
            `SELECT b.id, b.resource_name, b.resource_type,
                    DATE_FORMAT(b.booking_date, '%Y-%m-%d') as booking_date,
                    b.start_time, b.end_time, b.location, b.purpose,
                    b.user_name, b.user_role, b.status
             FROM bookings b
             WHERE b.status = 'approved'
             ORDER BY b.booking_date DESC, b.start_time ASC`
        );
        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Error fetching all booked resources:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get approved bookings for calendar
router.get('/bookings/calendar', async (req, res) => {
    try {
        const [bookings] = await db.query(
            `SELECT b.id, b.resource_name, b.resource_type, 
                    DATE_FORMAT(b.booking_date, '%Y-%m-%d') as booking_date,
                    b.start_time, b.end_time, b.location, b.purpose,
                    b.user_name, b.user_role
             FROM bookings b
             WHERE b.status = 'approved'
             ORDER BY b.booking_date ASC`
        );
        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Withdraw a booking
router.put('/bookings/:id/withdraw', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Verify ownership
        const [booking] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [id, user_id]
        );

        if (booking.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You can only withdraw your own bookings'
            });
        }

        if (booking[0].status !== 'pending' && booking[0].status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only pending or approved bookings can be withdrawn'
            });
        }

        const wasApproved = booking[0].status === 'approved';

        // Delete the booking instead of changing status (avoids ENUM issue)
        await db.query(
            'DELETE FROM bookings WHERE id = ?',
            [id]
        );

        // If it was approved, set resource back to available
        if (wasApproved) {
            await db.query(
                "UPDATE resources SET status = 'available' WHERE id = ?",
                [booking[0].resource_id]
            );
        }

        // Create notification
        await db.query(
            `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'info')`,
            [user_id, `Your booking for ${booking[0].resource_name} on ${formatDate(booking[0].booking_date)} has been cancelled/withdrawn successfully.`]
        );

        res.json({ success: true, message: 'Booking withdrawn successfully' });
    } catch (error) {
        console.error('Error withdrawing booking:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
