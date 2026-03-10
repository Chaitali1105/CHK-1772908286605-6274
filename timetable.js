const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /timetable - Fetch timetable entries with optional filters
router.get('/timetable', async (req, res) => {
    try {
        const { classroom, department, semester } = req.query;

        let query = `
            SELECT t.*, r.name as room_name, r.building, r.floor_no, r.room_no, r.type as room_type
            FROM timetable t
            JOIN resources r ON t.resource_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (classroom) {
            query += ' AND t.resource_id = ?';
            params.push(classroom);
        }
        if (department) {
            query += ' AND t.department = ?';
            params.push(department);
        }
        if (semester) {
            query += ' AND t.semester = ?';
            params.push(semester);
        }

        query += ' ORDER BY FIELD(t.day, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"), t.start_time';

        const [rows] = await pool.query(query, params);

        res.json({ success: true, timetable: rows });
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch timetable' });
    }
});

// GET /timetable/filters - Get distinct filter values
router.get('/timetable/filters', async (req, res) => {
    try {
        const [departments] = await pool.query('SELECT DISTINCT department FROM timetable ORDER BY department');
        const [semesters] = await pool.query('SELECT DISTINCT semester FROM timetable ORDER BY semester');
        const [classrooms] = await pool.query(
            `SELECT DISTINCT r.id, r.name 
             FROM timetable t 
             JOIN resources r ON t.resource_id = r.id 
             ORDER BY r.name`
        );

        res.json({
            success: true,
            departments: departments.map(d => d.department),
            semesters: semesters.map(s => s.semester),
            classrooms: classrooms
        });
    } catch (error) {
        console.error('Error fetching timetable filters:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch filters' });
    }
});

// GET /timetable/check-conflict - Check if a resource has a timetable class at given day/time
router.get('/timetable/check-conflict', async (req, res) => {
    try {
        const { resource_id, booking_date, start_time, end_time } = req.query;

        if (!resource_id || !booking_date || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        // Get the day of week from booking_date
        const date = new Date(booking_date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];

        if (dayName === 'Sunday') {
            return res.json({ success: true, conflicts: [], hasConflict: false });
        }

        const [conflicts] = await pool.query(
            `SELECT t.*, r.name as room_name
             FROM timetable t
             JOIN resources r ON t.resource_id = r.id
             WHERE t.resource_id = ?
             AND t.day = ?
             AND (
                 (t.start_time <= ? AND t.end_time > ?) OR
                 (t.start_time < ? AND t.end_time >= ?) OR
                 (t.start_time >= ? AND t.end_time <= ?)
             )`,
            [resource_id, dayName, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        res.json({
            success: true,
            conflicts: conflicts,
            hasConflict: conflicts.length > 0
        });
    } catch (error) {
        console.error('Error checking timetable conflict:', error);
        res.status(500).json({ success: false, message: 'Failed to check timetable conflict' });
    }
});

module.exports = router;
