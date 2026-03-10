-- Timetable table for BookMyCampus Class Timetable feature
USE bookmycampus;

DROP TABLE IF EXISTS timetable;

CREATE TABLE IF NOT EXISTS timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    resource_id INT NOT NULL,
    day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type ENUM('lecture', 'lab', 'practical') NOT NULL DEFAULT 'lecture',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    INDEX idx_day (day),
    INDEX idx_department (department),
    INDEX idx_semester (semester),
    INDEX idx_resource (resource_id)
);

-- =====================================================
-- Departments: CSE, Electrical, ENTC, AIDS, Mech, Civil
-- Semesters: 1 to 8
-- Resources used:
--   Lecture Halls: 10 (LH1), 11 (LH2), 12 (LH3)
--   Labs: 1 (Comp Lab 1), 2 (Comp Lab 2), 4 (Chemistry Lab), 19 (Comp Lab 3)
--   Auditorium: 5 (Main Auditorium), 6 (Seminar Hall)
-- =====================================================

-- ==================== MONDAY ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 10:00
('CSE-Sem1', 'Engineering Mathematics I', 'Dr. Agarwal', 'CSE', 1, 10, 'Monday', '09:00:00', '10:00:00', 'lecture'),
('Electrical-Sem1', 'Basic Electrical Engg', 'Prof. Kulkarni', 'Electrical', 1, 11, 'Monday', '09:00:00', '10:00:00', 'lecture'),
('ENTC-Sem3', 'Signals & Systems', 'Dr. Patil', 'ENTC', 3, 12, 'Monday', '09:00:00', '10:00:00', 'lecture'),
-- 10:00 - 11:00
('CSE-Sem3', 'Data Structures', 'Dr. Sharma', 'CSE', 3, 10, 'Monday', '10:00:00', '11:00:00', 'lecture'),
('AIDS-Sem3', 'Probability & Statistics', 'Prof. Desai', 'AIDS', 3, 11, 'Monday', '10:00:00', '11:00:00', 'lecture'),
('Mech-Sem5', 'Thermodynamics', 'Dr. Joshi', 'Mech', 5, 12, 'Monday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 13:00 (Labs - 2 hours)
('CSE-Sem3', 'DSA Lab', 'Dr. Sharma', 'CSE', 3, 1, 'Monday', '11:00:00', '13:00:00', 'lab'),
('AIDS-Sem5', 'Machine Learning Lab', 'Prof. Iyer', 'AIDS', 5, 2, 'Monday', '11:00:00', '13:00:00', 'lab'),
('ENTC-Sem5', 'Microprocessor Lab', 'Dr. Patil', 'ENTC', 5, 4, 'Monday', '11:00:00', '13:00:00', 'lab'),
-- 14:00 - 15:00
('CSE-Sem5', 'Operating Systems', 'Prof. Gupta', 'CSE', 5, 10, 'Monday', '14:00:00', '15:00:00', 'lecture'),
('Civil-Sem3', 'Strength of Materials', 'Dr. More', 'Civil', 3, 11, 'Monday', '14:00:00', '15:00:00', 'lecture'),
('Electrical-Sem5', 'Power Electronics', 'Prof. Kulkarni', 'Electrical', 5, 12, 'Monday', '14:00:00', '15:00:00', 'lecture'),
-- 15:00 - 16:00
('CSE-Sem7', 'Machine Learning', 'Dr. Reddy', 'CSE', 7, 10, 'Monday', '15:00:00', '16:00:00', 'lecture'),
('Mech-Sem7', 'Robotics', 'Prof. Nair', 'Mech', 7, 11, 'Monday', '15:00:00', '16:00:00', 'lecture'),
('Civil-Sem5', 'Structural Analysis', 'Dr. More', 'Civil', 5, 12, 'Monday', '15:00:00', '16:00:00', 'lecture');

-- ==================== TUESDAY ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 10:00
('CSE-Sem5', 'Computer Networks', 'Dr. Kumar', 'CSE', 5, 10, 'Tuesday', '09:00:00', '10:00:00', 'lecture'),
('ENTC-Sem3', 'Analog Circuits', 'Prof. Bhosale', 'ENTC', 3, 11, 'Tuesday', '09:00:00', '10:00:00', 'lecture'),
('Mech-Sem3', 'Engineering Mechanics', 'Dr. Joshi', 'Mech', 3, 12, 'Tuesday', '09:00:00', '10:00:00', 'lecture'),
-- 10:00 - 11:00
('AIDS-Sem1', 'Intro to AI', 'Prof. Iyer', 'AIDS', 1, 10, 'Tuesday', '10:00:00', '11:00:00', 'lecture'),
('Electrical-Sem3', 'Network Analysis', 'Prof. Kulkarni', 'Electrical', 3, 11, 'Tuesday', '10:00:00', '11:00:00', 'lecture'),
('Civil-Sem1', 'Engineering Drawing', 'Dr. Pawar', 'Civil', 1, 12, 'Tuesday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 13:00 (Labs)
('Electrical-Sem3', 'Electrical Machines Lab', 'Prof. Kulkarni', 'Electrical', 3, 4, 'Tuesday', '11:00:00', '13:00:00', 'lab'),
('CSE-Sem5', 'Networking Lab', 'Dr. Kumar', 'CSE', 5, 1, 'Tuesday', '11:00:00', '13:00:00', 'lab'),
('Mech-Sem3', 'Workshop Practice', 'Dr. Joshi', 'Mech', 3, 19, 'Tuesday', '11:00:00', '13:00:00', 'practical'),
-- 14:00 - 15:00
('CSE-Sem3', 'Discrete Mathematics', 'Dr. Agarwal', 'CSE', 3, 10, 'Tuesday', '14:00:00', '15:00:00', 'lecture'),
('AIDS-Sem7', 'Deep Learning', 'Prof. Iyer', 'AIDS', 7, 11, 'Tuesday', '14:00:00', '15:00:00', 'lecture'),
('ENTC-Sem7', 'Embedded Systems', 'Dr. Patil', 'ENTC', 7, 12, 'Tuesday', '14:00:00', '15:00:00', 'lecture'),
-- 15:00 - 16:00
('Mech-Sem5', 'Fluid Mechanics', 'Prof. Nair', 'Mech', 5, 10, 'Tuesday', '15:00:00', '16:00:00', 'lecture'),
('Civil-Sem7', 'Transportation Engg', 'Dr. Pawar', 'Civil', 7, 11, 'Tuesday', '15:00:00', '16:00:00', 'lecture'),
('Electrical-Sem7', 'Power Systems', 'Prof. Kulkarni', 'Electrical', 7, 12, 'Tuesday', '15:00:00', '16:00:00', 'lecture');

-- ==================== WEDNESDAY ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 10:00
('CSE-Sem1', 'Physics', 'Dr. Patel', 'CSE', 1, 10, 'Wednesday', '09:00:00', '10:00:00', 'lecture'),
('AIDS-Sem3', 'Data Science Basics', 'Prof. Desai', 'AIDS', 3, 11, 'Wednesday', '09:00:00', '10:00:00', 'lecture'),
('Civil-Sem3', 'Surveying', 'Dr. Pawar', 'Civil', 3, 12, 'Wednesday', '09:00:00', '10:00:00', 'lecture'),
-- 10:00 - 11:00
('ENTC-Sem5', 'Digital Signal Processing', 'Dr. Patil', 'ENTC', 5, 10, 'Wednesday', '10:00:00', '11:00:00', 'lecture'),
('CSE-Sem7', 'Cloud Computing', 'Dr. Reddy', 'CSE', 7, 11, 'Wednesday', '10:00:00', '11:00:00', 'lecture'),
('Mech-Sem1', 'Engineering Graphics', 'Prof. Nair', 'Mech', 1, 12, 'Wednesday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 13:00 (Labs / Practicals)
('CSE-Sem7', 'ML Lab', 'Dr. Reddy', 'CSE', 7, 1, 'Wednesday', '11:00:00', '13:00:00', 'lab'),
('ENTC-Sem3', 'Electronics Lab', 'Prof. Bhosale', 'ENTC', 3, 4, 'Wednesday', '11:00:00', '13:00:00', 'lab'),
('AIDS-Sem3', 'Python Lab', 'Prof. Desai', 'AIDS', 3, 2, 'Wednesday', '11:00:00', '13:00:00', 'lab'),
-- 14:00 - 15:00
('Electrical-Sem1', 'Engineering Chemistry', 'Dr. Patel', 'Electrical', 1, 10, 'Wednesday', '14:00:00', '15:00:00', 'lecture'),
('Mech-Sem3', 'Material Science', 'Prof. Nair', 'Mech', 3, 11, 'Wednesday', '14:00:00', '15:00:00', 'lecture'),
('Civil-Sem5', 'Geotechnical Engg', 'Dr. More', 'Civil', 5, 12, 'Wednesday', '14:00:00', '15:00:00', 'lecture'),
-- 15:00 - 16:00
('CSE-Sem5', 'DBMS', 'Dr. Sharma', 'CSE', 5, 10, 'Wednesday', '15:00:00', '16:00:00', 'lecture'),
('AIDS-Sem5', 'Big Data Analytics', 'Prof. Iyer', 'AIDS', 5, 11, 'Wednesday', '15:00:00', '16:00:00', 'lecture'),
('Electrical-Sem5', 'Control Systems', 'Prof. Kulkarni', 'Electrical', 5, 12, 'Wednesday', '15:00:00', '16:00:00', 'lecture');

-- ==================== THURSDAY ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 10:00
('CSE-Sem3', 'OOP Concepts', 'Dr. Sharma', 'CSE', 3, 10, 'Thursday', '09:00:00', '10:00:00', 'lecture'),
('Electrical-Sem5', 'Electrical Machines', 'Prof. Kulkarni', 'Electrical', 5, 11, 'Thursday', '09:00:00', '10:00:00', 'lecture'),
('Civil-Sem5', 'Concrete Technology', 'Dr. Pawar', 'Civil', 5, 12, 'Thursday', '09:00:00', '10:00:00', 'lecture'),
-- 10:00 - 11:00
('ENTC-Sem1', 'Basic Electronics', 'Prof. Bhosale', 'ENTC', 1, 10, 'Thursday', '10:00:00', '11:00:00', 'lecture'),
('AIDS-Sem5', 'NLP', 'Prof. Iyer', 'AIDS', 5, 11, 'Thursday', '10:00:00', '11:00:00', 'lecture'),
('Mech-Sem7', 'CAD/CAM', 'Prof. Nair', 'Mech', 7, 12, 'Thursday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 13:00 (Labs / Practicals)
('Civil-Sem3', 'Surveying Practical', 'Dr. Pawar', 'Civil', 3, 19, 'Thursday', '11:00:00', '13:00:00', 'practical'),
('CSE-Sem5', 'DBMS Lab', 'Dr. Sharma', 'CSE', 5, 1, 'Thursday', '11:00:00', '13:00:00', 'lab'),
('Electrical-Sem5', 'Power Electronics Lab', 'Prof. Kulkarni', 'Electrical', 5, 4, 'Thursday', '11:00:00', '13:00:00', 'lab'),
-- 14:00 - 15:00
('CSE-Sem1', 'Programming in C', 'Dr. Agarwal', 'CSE', 1, 10, 'Thursday', '14:00:00', '15:00:00', 'lecture'),
('Mech-Sem5', 'Heat Transfer', 'Dr. Joshi', 'Mech', 5, 11, 'Thursday', '14:00:00', '15:00:00', 'lecture'),
('ENTC-Sem5', 'Communication Theory', 'Dr. Patil', 'ENTC', 5, 12, 'Thursday', '14:00:00', '15:00:00', 'lecture'),
-- 15:00 - 16:00
('AIDS-Sem7', 'Computer Vision', 'Prof. Desai', 'AIDS', 7, 10, 'Thursday', '15:00:00', '16:00:00', 'lecture'),
('Civil-Sem7', 'Environmental Engg', 'Dr. More', 'Civil', 7, 11, 'Thursday', '15:00:00', '16:00:00', 'lecture'),
('Electrical-Sem3', 'Electromagnetic Theory', 'Prof. Kulkarni', 'Electrical', 3, 12, 'Thursday', '15:00:00', '16:00:00', 'lecture');

-- ==================== FRIDAY ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 10:00
('Mech-Sem1', 'Engineering Mathematics I', 'Dr. Agarwal', 'Mech', 1, 10, 'Friday', '09:00:00', '10:00:00', 'lecture'),
('ENTC-Sem5', 'VLSI Design', 'Dr. Patil', 'ENTC', 5, 11, 'Friday', '09:00:00', '10:00:00', 'lecture'),
('AIDS-Sem1', 'Linear Algebra', 'Prof. Desai', 'AIDS', 1, 12, 'Friday', '09:00:00', '10:00:00', 'lecture'),
-- 10:00 - 11:00
('CSE-Sem5', 'Software Engineering', 'Prof. Mehta', 'CSE', 5, 10, 'Friday', '10:00:00', '11:00:00', 'lecture'),
('Civil-Sem1', 'Engineering Mathematics I', 'Dr. Agarwal', 'Civil', 1, 11, 'Friday', '10:00:00', '11:00:00', 'lecture'),
('Electrical-Sem7', 'Smart Grid Technology', 'Prof. Kulkarni', 'Electrical', 7, 12, 'Friday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 13:00 (Labs / Practicals)
('AIDS-Sem5', 'Data Analytics Lab', 'Prof. Iyer', 'AIDS', 5, 2, 'Friday', '11:00:00', '13:00:00', 'lab'),
('Mech-Sem5', 'Fluid Mechanics Lab', 'Prof. Nair', 'Mech', 5, 19, 'Friday', '11:00:00', '13:00:00', 'practical'),
('CSE-Sem1', 'C Programming Lab', 'Dr. Agarwal', 'CSE', 1, 1, 'Friday', '11:00:00', '13:00:00', 'lab'),
-- 14:00 - 15:00
('ENTC-Sem7', 'IoT Systems', 'Prof. Bhosale', 'ENTC', 7, 10, 'Friday', '14:00:00', '15:00:00', 'lecture'),
('CSE-Sem7', 'Blockchain Technology', 'Dr. Kumar', 'CSE', 7, 11, 'Friday', '14:00:00', '15:00:00', 'lecture'),
('Mech-Sem3', 'Manufacturing Processes', 'Dr. Joshi', 'Mech', 3, 12, 'Friday', '14:00:00', '15:00:00', 'lecture'),
-- 15:00 - 16:00
('Civil-Sem3', 'Fluid Mechanics', 'Dr. More', 'Civil', 3, 10, 'Friday', '15:00:00', '16:00:00', 'lecture'),
('AIDS-Sem7', 'Reinforcement Learning', 'Prof. Desai', 'AIDS', 7, 11, 'Friday', '15:00:00', '16:00:00', 'lecture'),
('Electrical-Sem1', 'Engineering Physics', 'Dr. Patel', 'Electrical', 1, 12, 'Friday', '15:00:00', '16:00:00', 'lecture');

-- ==================== SATURDAY (shorter day) ====================
INSERT INTO timetable (class_name, subject, faculty, department, semester, resource_id, day, start_time, end_time, type) VALUES
-- 09:00 - 11:00 (Labs)
('CSE-Sem3', 'OOP Lab', 'Dr. Sharma', 'CSE', 3, 1, 'Saturday', '09:00:00', '11:00:00', 'lab'),
('ENTC-Sem5', 'DSP Lab', 'Dr. Patil', 'ENTC', 5, 2, 'Saturday', '09:00:00', '11:00:00', 'lab'),
('Mech-Sem3', 'Material Testing Lab', 'Prof. Nair', 'Mech', 3, 4, 'Saturday', '09:00:00', '11:00:00', 'practical'),
-- Even sem lectures on Saturday
('CSE-Sem2', 'Mathematics II', 'Dr. Agarwal', 'CSE', 2, 6, 'Saturday', '09:00:00', '10:00:00', 'lecture'),
('AIDS-Sem4', 'Statistical Learning', 'Prof. Desai', 'AIDS', 4, 5, 'Saturday', '09:00:00', '10:00:00', 'lecture'),
('CSE-Sem4', 'Computer Architecture', 'Dr. Kumar', 'CSE', 4, 6, 'Saturday', '10:00:00', '11:00:00', 'lecture'),
('Electrical-Sem4', 'Signals & Systems', 'Prof. Kulkarni', 'Electrical', 4, 5, 'Saturday', '10:00:00', '11:00:00', 'lecture'),
-- 11:00 - 12:00
('CSE-Sem8', 'Project Seminar', 'Dr. Reddy', 'CSE', 8, 10, 'Saturday', '11:00:00', '12:00:00', 'lecture'),
('AIDS-Sem8', 'Industry Project Review', 'Prof. Iyer', 'AIDS', 8, 11, 'Saturday', '11:00:00', '12:00:00', 'lecture'),
('Mech-Sem8', 'Project Presentation', 'Dr. Joshi', 'Mech', 8, 12, 'Saturday', '11:00:00', '12:00:00', 'lecture'),
('AIDS-Sem6', 'Neural Networks', 'Prof. Iyer', 'AIDS', 6, 5, 'Saturday', '11:00:00', '12:00:00', 'lecture'),
('CSE-Sem6', 'Compiler Design', 'Prof. Mehta', 'CSE', 6, 6, 'Saturday', '11:00:00', '12:00:00', 'lecture'),
('Civil-Sem4', 'Structural Mechanics', 'Dr. More', 'Civil', 4, 10, 'Saturday', '10:00:00', '11:00:00', 'lecture'),
('Mech-Sem6', 'IC Engines', 'Dr. Joshi', 'Mech', 6, 11, 'Saturday', '10:00:00', '11:00:00', 'lecture'),
('ENTC-Sem6', 'Wireless Communication', 'Dr. Patil', 'ENTC', 6, 12, 'Saturday', '10:00:00', '11:00:00', 'lecture'),
-- 12:00 - 13:00
('Electrical-Sem2', 'Mathematics II', 'Dr. Agarwal', 'Electrical', 2, 10, 'Saturday', '12:00:00', '13:00:00', 'lecture'),
('Civil-Sem2', 'Engineering Geology', 'Dr. Pawar', 'Civil', 2, 11, 'Saturday', '12:00:00', '13:00:00', 'lecture'),
('ENTC-Sem2', 'Electronic Devices', 'Prof. Bhosale', 'ENTC', 2, 12, 'Saturday', '12:00:00', '13:00:00', 'lecture'),
('Electrical-Sem6', 'Microcontrollers', 'Prof. Kulkarni', 'Electrical', 6, 5, 'Saturday', '12:00:00', '13:00:00', 'lecture'),
('Civil-Sem6', 'Water Resources Engg', 'Dr. More', 'Civil', 6, 6, 'Saturday', '12:00:00', '13:00:00', 'lecture'),
('Mech-Sem4', 'Kinematics of Machines', 'Prof. Nair', 'Mech', 4, 10, 'Saturday', '12:00:00', '13:00:00', 'lecture');
