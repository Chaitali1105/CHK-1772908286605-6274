-- Additional tables for BookMyCampus booking system
USE bookmycampus;

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('classroom', 'lab', 'auditorium', 'sport ground', 'workshop', 'meeting room') NOT NULL,
    building VARCHAR(50) NOT NULL,
    floor_no VARCHAR(10) NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    capacity INT,
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    resource_id INT NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booking_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_booking_date (booking_date)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type ENUM('approval', 'rejection', 'reminder', 'info') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read)
);

-- Insert sample resources
INSERT INTO resources (name, type, building, floor_no, room_no, capacity, status) VALUES
('Computer Lab 1', 'lab', 'Block A', '2', '201', 40, 'available'),
('Computer Lab 2', 'lab', 'Block A', '2', '202', 40, 'available'),
('Physics Lab', 'lab', 'Block B', '3', '301', 30, 'available'),
('Chemistry Lab', 'lab', 'Block B', '3', '302', 30, 'available'),
('Main Auditorium', 'auditorium', 'Block C', 'G', '001', 500, 'available'),
('Seminar Hall', 'auditorium', 'Block C', '1', '101', 200, 'available'),
('Basketball Court', 'sport ground', 'Sports Complex', 'G', 'Outdoor', 20, 'available'),
('Football Ground', 'sport ground', 'Sports Complex', 'G', 'Outdoor', 50, 'available'),
('Cricket Ground', 'sport ground', 'Sports Complex', 'G', 'Outdoor', 30, 'available'),
('Lecture Hall 1', 'classroom', 'Block A', '1', '101', 60, 'available'),
('Lecture Hall 2', 'classroom', 'Block A', '1', '102', 60, 'available'),
('Lecture Hall 3', 'classroom', 'Block A', '1', '103', 60, 'available'),
('Workshop Room 1', 'workshop', 'Block D', '1', '105', 25, 'available'),
('Workshop Room 2', 'workshop', 'Block D', '1', '106', 25, 'available'),
('Conference Room 1', 'meeting room', 'Block E', '4', '401', 15, 'available'),
('Conference Room 2', 'meeting room', 'Block E', '4', '402', 15, 'available'),
('Board Room', 'meeting room', 'Block E', '5', '501', 20, 'available');
