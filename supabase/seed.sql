-- Seed data for testing
-- 5 Employees and 5 Students

-- Insert Employees
INSERT INTO people (code, full_name, role, registration_date, status) VALUES
('EMP001', 'John Smith', 'employee', CURRENT_DATE, 'active'),
('EMP002', 'Sarah Johnson', 'employee', CURRENT_DATE, 'active'),
('EMP003', 'Michael Brown', 'employee', CURRENT_DATE, 'active'),
('EMP004', 'Emily Davis', 'employee', CURRENT_DATE, 'active'),
('EMP005', 'David Wilson', 'employee', CURRENT_DATE, 'active');

-- Insert Students
INSERT INTO people (code, full_name, role, registration_date, status) VALUES
('STU001', 'Alice Thompson', 'student', CURRENT_DATE, 'active'),
('STU002', 'Bob Martinez', 'student', CURRENT_DATE, 'active'),
('STU003', 'Carol Garcia', 'student', CURRENT_DATE, 'active'),
('STU004', 'Daniel Lee', 'student', CURRENT_DATE, 'active'),
('STU005', 'Emma Anderson', 'student', CURRENT_DATE, 'active');
