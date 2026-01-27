const express = require('express');
const pool = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      `SELECT n.*, u1.name as from_user_name, q.quotation_number
       FROM notifications n
       LEFT JOIN users u1 ON n.from_user_id = u1.id
       LEFT JOIN quotations q ON n.quotation_id = q.id
       WHERE n.to_user_id = ?
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND to_user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/notifications/send-to-customer
// @desc    Send message to customer (admin)
// @access  Private (Admin)
router.post('/send-to-customer', protect, async (req, res) => {
  try {
    const { quotation_id, message, vehicle_number } = req.body;

    if (!quotation_id || !message || !vehicle_number) {
      return res.status(400).json({ message: 'Quotation ID, message, and vehicle number are required' });
    }

    // Create notification record (for tracking)
    await pool.execute(
      `INSERT INTO notifications (from_user_id, type, message, quotation_id, vehicle_number)
       VALUES (?, 'message_to_customer', ?, ?, ?)`,
      [req.user.id, message, quotation_id, vehicle_number]
    );

    // Update quotation status
    await pool.execute(
      "UPDATE quotations SET status = 'sent_to_customer' WHERE id = ?",
      [quotation_id]
    );

    res.json({ message: 'Message sent to customer successfully' });
  } catch (error) {
    console.error('Send to customer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
