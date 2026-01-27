-- TrackNFix Database Schema
-- Vehicle Service Record Management System

CREATE DATABASE IF NOT EXISTS tracknfix;
USE tracknfix;

-- Users table (employees, admins, managers)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin', 'manager') NOT NULL,
    telephone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    address TEXT,
    telephone VARCHAR(20),
    vehicle_type VARCHAR(100),
    color VARCHAR(50),
    insurance_company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Jobs table (service, repair, accident recovery)
CREATE TABLE IF NOT EXISTS jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id INT,
    employee_id INT,
    job_type ENUM('monthly_service', 'repair', 'accident_recovery') NOT NULL,
    status ENUM('pending', 'reviewed', 'quotation_created', 'quotation_sent', 'completed') DEFAULT 'pending',
    special_notes TEXT,
    initial_images JSON,
    after_images JSON,
    parts_replaced JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status)
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    job_id INT,
    vehicle_id INT,
    admin_id INT,
    manager_id INT,
    customer_name VARCHAR(255),
    telephone VARCHAR(20),
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(100),
    color VARCHAR(50),
    job_type ENUM('monthly_service', 'repair', 'accident_recovery') NOT NULL,
    jobs_done JSON,
    prices JSON,
    labor_cost DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    insurance_company VARCHAR(255),
    status ENUM('draft', 'sent_to_manager', 'approved', 'sent_to_customer') DEFAULT 'draft',
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_job_id (job_id),
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_status (status)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_user_id INT,
    to_user_id INT,
    type ENUM('quotation_ready', 'message_to_customer') NOT NULL,
    message TEXT,
    quotation_id INT,
    job_id INT,
    vehicle_number VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    INDEX idx_to_user_id (to_user_id),
    INDEX idx_is_read (is_read)
);

-- Job counter for auto-incrementing job numbers
CREATE TABLE IF NOT EXISTS job_counter (
    id INT PRIMARY KEY AUTO_INCREMENT,
    last_job_number INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quotation counter for auto-incrementing quotation numbers
CREATE TABLE IF NOT EXISTS quotation_counter (
    id INT PRIMARY KEY AUTO_INCREMENT,
    last_quotation_number INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize counters
INSERT INTO job_counter (last_job_number) VALUES (0) ON DUPLICATE KEY UPDATE last_job_number=last_job_number;
INSERT INTO quotation_counter (last_quotation_number) VALUES (0) ON DUPLICATE KEY UPDATE last_quotation_number=last_quotation_number;

-- Add password reset columns to users table (for forgot password feature)
-- Note: Run this ALTER TABLE command manually if the columns don't exist
-- ALTER TABLE users 
-- ADD COLUMN reset_password_otp VARCHAR(255) NULL,
-- ADD COLUMN reset_password_expires DATETIME NULL;
