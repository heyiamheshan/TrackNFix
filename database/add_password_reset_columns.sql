-- Migration: Add password reset columns to users table
-- Run this script if you haven't added the columns yet

USE tracknfix;

-- Check if columns exist before adding (MySQL doesn't support IF NOT EXISTS in ALTER TABLE)
-- If you get an error saying columns already exist, that's fine - just ignore it

ALTER TABLE users 
ADD COLUMN reset_password_otp VARCHAR(255) NULL,
ADD COLUMN reset_password_expires DATETIME NULL;
