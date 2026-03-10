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

// Smart Slot Recommendation
// Input: resource_id, desired_date, start_time, end_time, user_role
// Output: { available: true/false, conflicts: [...], recommendations: [...] }
router.get('/bookings/smart-slots', async (req, res) => {
    try {
        const { resource_id, desired_date, start_time, end_time, user_role } = req.query;

        if (!resource_id || !desired_date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'resource_id, desired_date, start_time, and end_time are required'
            });
        }

        // 1. Check if the requested slot is available
        const [conflicts] = await db.query(
            `SELECT b.id, b.user_name, b.user_role, b.start_time, b.end_time, b.purpose, b.status
             FROM bookings b
             WHERE b.resource_id = ?
             AND b.booking_date = ?
             AND b.status IN ('pending', 'approved')
             AND (
                 (b.start_time <= ? AND b.end_time > ?) OR
                 (b.start_time < ? AND b.end_time >= ?) OR
                 (b.start_time >= ? AND b.end_time <= ?)
             )`,
            [resource_id, desired_date, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        // 2. Check timetable conflicts for the day-of-week
        const dayOfWeek = new Date(desired_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
        const [ttConflicts] = await db.query(
            `SELECT t.subject, t.faculty, t.class_name, t.department, t.semester, t.start_time, t.end_time, t.type
             FROM timetable t
             WHERE t.resource_id = ?
             AND t.day = ?
             AND (
                 (t.start_time <= ? AND t.end_time > ?) OR
                 (t.start_time < ? AND t.end_time >= ?) OR
                 (t.start_time >= ? AND t.end_time <= ?)
             )`,
            [resource_id, dayOfWeek, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        const isAvailable = conflicts.length === 0 && ttConflicts.length === 0;

        // 3. If unavailable, calculate alternative slots for the same resource on the same date
        let recommendations = [];
        if (!isAvailable) {
            // Get ALL booked slots for this resource on this date
            const [allBooked] = await db.query(
                `SELECT start_time, end_time FROM bookings
                 WHERE resource_id = ? AND booking_date = ? AND status IN ('pending', 'approved')
                 ORDER BY start_time`,
                [resource_id, desired_date]
            );

            // Get ALL timetable slots for this resource on this day
            const [allTT] = await db.query(
                `SELECT start_time, end_time FROM timetable
                 WHERE resource_id = ? AND day = ?
                 ORDER BY start_time`,
                [resource_id, dayOfWeek]
            );

            // Merge all occupied intervals
            const occupied = [...allBooked, ...allTT].map(s => ({
                start: s.start_time.substring(0, 5),
                end: s.end_time.substring(0, 5)
            }));
            occupied.sort((a, b) => a.start.localeCompare(b.start));

            // Merge overlapping intervals
            const merged = [];
            for (const slot of occupied) {
                if (merged.length > 0 && slot.start <= merged[merged.length - 1].end) {
                    merged[merged.length - 1].end = slot.end > merged[merged.length - 1].end ? slot.end : merged[merged.length - 1].end;
                } else {
                    merged.push({ ...slot });
                }
            }

            // Calculate requested duration in minutes
            const reqDuration = (parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]))
                - (parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]));

            // Find free gaps between 08:00 and 20:00
            const dayStart = '08:00';
            const dayEnd = '20:00';
            const gaps = [];
            let cursor = dayStart;

            for (const slot of merged) {
                if (cursor < slot.start) {
                    gaps.push({ start: cursor, end: slot.start });
                }
                if (slot.end > cursor) cursor = slot.end;
            }
            if (cursor < dayEnd) {
                gaps.push({ start: cursor, end: dayEnd });
            }

            // Generate recommendation slots that fit the requested duration
            for (const gap of gaps) {
                const gapStartMin = parseInt(gap.start.split(':')[0]) * 60 + parseInt(gap.start.split(':')[1]);
                const gapEndMin = parseInt(gap.end.split(':')[0]) * 60 + parseInt(gap.end.split(':')[1]);

                if (gapEndMin - gapStartMin >= reqDuration) {
                    // Offer up to 2 slots per gap (start of gap, midpoint if fits)
                    const s1Start = gap.start;
                    const s1EndMin = gapStartMin + reqDuration;
                    const s1End = String(Math.floor(s1EndMin / 60)).padStart(2, '0') + ':' + String(s1EndMin % 60).padStart(2, '0');
                    recommendations.push({ start_time: s1Start, end_time: s1End, date: desired_date });

                    // Another slot starting 1 hour later if it still fits
                    const s2StartMin = gapStartMin + 60;
                    const s2EndMin = s2StartMin + reqDuration;
                    if (s2EndMin <= gapEndMin && s2StartMin !== gapStartMin) {
                        const s2Start = String(Math.floor(s2StartMin / 60)).padStart(2, '0') + ':' + String(s2StartMin % 60).padStart(2, '0');
                        const s2End = String(Math.floor(s2EndMin / 60)).padStart(2, '0') + ':' + String(s2EndMin % 60).padStart(2, '0');
                        recommendations.push({ start_time: s2Start, end_time: s2End, date: desired_date });
                    }
                }

                if (recommendations.length >= 5) break;
            }
        }

        // 4. Build response based on role
        const conflictDetails = user_role === 'admin'
            ? conflicts.map(c => ({
                booked_by: c.user_name,
                role: c.user_role,
                time: `${c.start_time} - ${c.end_time}`,
                purpose: c.purpose,
                status: c.status
            }))
            : conflicts.map(c => ({
                time: `${c.start_time} - ${c.end_time}`,
                status: c.status
            }));

        const ttDetails = ttConflicts.map(t => ({
            subject: t.subject,
            faculty: t.faculty,
            class_name: t.class_name,
            time: `${t.start_time} - ${t.end_time}`,
            type: t.type
        }));

        res.json({
            success: true,
            available: isAvailable,
            booking_conflicts: conflictDetails,
            timetable_conflicts: ttDetails,
            recommendations
        });

    } catch (error) {
        console.error('Error in smart slot recommendation:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
