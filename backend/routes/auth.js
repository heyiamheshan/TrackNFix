const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const generateToken = require('../utils/generateToken');
const { protect, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');

// Generate a 6-digit numeric OTP
const generateNumericOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, telephone } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check role limits
    if (role === 'admin' || role === 'manager') {
      const [roleCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        [role]
      );

      const maxAllowed = role === 'admin' ? 2 : 2;
      if (roleCount[0].count >= maxAllowed) {
        return res.status(400).json({ 
          message: `Maximum ${maxAllowed} ${role}(s) already registered` 
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, telephone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, telephone || null]
    );

    const [newUser] = await pool.execute(
      'SELECT id, name, email, role, telephone FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser[0],
      token: generateToken(result.insertId)
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    let users;
    try {
      [users] = await pool.execute(
        'SELECT id, email, reset_password_otp, reset_password_expires FROM users WHERE email = ?',
        [email]
      );
    } catch (dbError) {
      // Check if error is due to missing columns
      if (dbError.message && dbError.message.includes('Unknown column')) {
        console.error('❌ Database columns missing. Please run the migration script.');
        return res.status(500).json({ 
          message: 'Database configuration error. Please contact administrator.',
          error: process.env.NODE_ENV === 'development' ? 'Missing reset_password_otp or reset_password_expires columns' : undefined
        });
      }
      throw dbError;
    }

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    const user = users[0];

    // Check if OTP exists and is not expired
    if (!user.reset_password_otp || !user.reset_password_expires || new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Compare provided OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp, user.reset_password_otp);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    // OTP is valid. Clear OTP and expiry, or you might keep it for a short time
    // to allow password reset in the next step without re-verifying.
    // For now, we'll indicate success.
    res.status(200).json({ message: 'OTP verified successfully. Proceed to reset password.' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// @route   POST /api/auth/reset-password
// @desc    Reset user password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, otp } = req.body; // Include OTP to ensure verification happened

    if (!email || !newPassword || !otp) {
      return res.status(400).json({ message: 'Email, new password, and OTP are required' });
    }
    
    // Perform OTP verification again to ensure the link/process is still valid
    let users;
    try {
      [users] = await pool.execute(
        'SELECT id, reset_password_otp, reset_password_expires FROM users WHERE email = ?',
        [email]
      );
    } catch (dbError) {
      // Check if error is due to missing columns
      if (dbError.message && dbError.message.includes('Unknown column')) {
        console.error('❌ Database columns missing. Please run the migration script.');
        return res.status(500).json({ 
          message: 'Database configuration error. Please contact administrator.',
          error: process.env.NODE_ENV === 'development' ? 'Missing reset_password_otp or reset_password_expires columns' : undefined
        });
      }
      throw dbError;
    }

    if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    const user = users[0];

    if (!user.reset_password_otp || !user.reset_password_expires || new Date() > new Date(user.reset_password_expires)) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const isMatch = await bcrypt.compare(otp, user.reset_password_otp);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    try {
      await pool.execute(
        'UPDATE users SET password = ?, reset_password_otp = NULL, reset_password_expires = NULL WHERE id = ?',
        [hashedPassword, user.id]
      );
    } catch (dbError) {
      // Check if error is due to missing columns
      if (dbError.message && dbError.message.includes('Unknown column')) {
        console.error('❌ Database columns missing. Please run the migration script.');
        return res.status(500).json({ 
          message: 'Database configuration error. Please contact administrator.',
          error: process.env.NODE_ENV === 'development' ? 'Missing reset_password_otp or reset_password_expires columns' : undefined
        });
      }
      throw dbError;
    }

    res.status(200).json({ message: 'Password reset successfully!' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// @route   POST /api/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    let users;
    try {
      [users] = await pool.execute(
        'SELECT id, name, email FROM users WHERE email = ?',
        [email]
      );
    } catch (dbError) {
      console.error('Database error in forgot-password:', dbError);
      return res.status(500).json({ 
        message: 'Database error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (users.length === 0) {
      // For security, don't reveal if the user exists or not
      return res.status(200).json({ message: 'If a user with that email exists, a password reset OTP has been sent.' });
    }

    const user = users[0];
    const otp = generateNumericOTP();
    const hashedOtp = await bcrypt.hash(otp, 10); // Hash the OTP
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    try {
      await pool.execute(
        'UPDATE users SET reset_password_otp = ?, reset_password_expires = ? WHERE id = ?',
        [hashedOtp, otpExpires, user.id]
      );
    } catch (dbError) {
      // Check if error is due to missing columns
      if (dbError.message && dbError.message.includes('Unknown column')) {
        console.error('❌ Database columns missing. Please run the migration script.');
        return res.status(500).json({ 
          message: 'Database configuration error. Please run: ALTER TABLE users ADD COLUMN reset_password_otp VARCHAR(255) NULL, ADD COLUMN reset_password_expires DATETIME NULL;',
          error: process.env.NODE_ENV === 'development' ? 'Missing reset_password_otp or reset_password_expires columns' : undefined
        });
      }
      throw dbError;
    }

    const emailHtml = `
      <p>Dear ${user.name},</p>
      <p>You have requested to reset your password for Jayakody Auto Electricals.</p>
      <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 15 minutes.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thank you,<br/>Jayakody Auto Electricals Team</p>
    `;

    const emailResult = await sendEmail(user.email, 'Jayakody Auto Electricals - Password Reset OTP', emailHtml);

    if (!emailResult.success) {
      console.error('❌ Failed to send password reset email:', emailResult.error);
      console.error('Error code:', emailResult.code);
      
      // For development: show the OTP in console and allow testing to continue
      if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n⚠️  ============================================');
        console.log('⚠️  DEVELOPMENT MODE - Email not configured');
        console.log('⚠️  OTP for', user.email, 'is:', otp);
        console.log('⚠️  This OTP is valid for 15 minutes.');
        console.log('⚠️  ============================================\n');
        
        // Return success with OTP in development mode
        return res.status(200).json({ 
          message: 'OTP generated (email not configured). Check server console for OTP.',
          devOtp: otp,
          warning: 'Email service not configured. OTP shown for testing only.'
        });
      }
      
      // In production, return error
      return res.status(500).json({ 
        message: 'Error sending OTP email. Please check your email configuration.',
        error: emailResult.error
      });
    }

    res.status(200).json({ message: 'If a user with that email exists, a password reset OTP has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/signin
// @desc    Login user
// @access  Public
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      telephone: user.telephone
    };

    res.json({
      message: 'Login successful',
      user: userData,
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, telephone FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
