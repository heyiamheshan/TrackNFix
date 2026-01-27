const express = require('express');
const pool = require('../config/database');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// @route   POST /api/jobs
// @desc    Create a new job (employee)
// @access  Private (Employee)
router.post('/', protect, authorize('employee'), upload.array('images', 20), async (req, res) => {
  try {
    const { job_type, special_notes, initial_images, after_images, parts_replaced, vehicle_id } = req.body;

    if (!job_type) {
      return res.status(400).json({ message: 'Job type is required' });
    }

    if (!vehicle_id) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    // Get uploaded files
    const uploadedFiles = req.files || [];
    const filePaths = uploadedFiles.map(file => `/uploads/${file.filename}`);

    // Parse JSON fields
    let initialImagesArray = [];
    let afterImagesArray = [];
    let partsReplacedArray = [];

    if (initial_images) {
      try {
        initialImagesArray = typeof initial_images === 'string' ? JSON.parse(initial_images) : initial_images;
        // Map to actual file paths
        const initialCount = initialImagesArray.length;
        initialImagesArray = filePaths.slice(0, initialCount).map(path => path);
      } catch (e) {
        initialImagesArray = filePaths.slice(0, Math.ceil(uploadedFiles.length / 2));
      }
    }

    if (after_images) {
      try {
        afterImagesArray = typeof after_images === 'string' ? JSON.parse(after_images) : after_images;
        // Map to actual file paths
        const initialCount = initialImagesArray.length || 0;
        afterImagesArray = filePaths.slice(initialCount).map(path => path);
      } catch (e) {
        const initialCount = initialImagesArray.length || 0;
        afterImagesArray = filePaths.slice(initialCount);
      }
    }

    if (parts_replaced) {
      try {
        partsReplacedArray = typeof parts_replaced === 'string' ? JSON.parse(parts_replaced) : parts_replaced;
      } catch (e) {
        partsReplacedArray = [];
      }
    }

    // Generate job number
    await pool.execute('UPDATE job_counter SET last_job_number = last_job_number + 1');
    const [counter] = await pool.execute('SELECT last_job_number FROM job_counter LIMIT 1');
    const jobNumber = `JOB-${String(counter[0].last_job_number).padStart(6, '0')}`;

    // Create job
    const [result] = await pool.execute(
      `INSERT INTO jobs (job_number, employee_id, vehicle_id, job_type, special_notes, initial_images, after_images, parts_replaced, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        jobNumber,
        req.user.id,
        vehicle_id,
        job_type,
        special_notes || null,
        JSON.stringify(initialImagesArray),
        JSON.stringify(afterImagesArray),
        JSON.stringify(partsReplacedArray)
      ]
    );

    const [newJob] = await pool.execute(
      `SELECT j.*, u.name as employee_name, v.vehicle_number, v.customer_name, v.vehicle_type, v.color
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Job created successfully',
      job: newJob[0]
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/jobs/pending
// @desc    Get pending jobs (admin)
// @access  Private (Admin)
router.get('/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const [jobs] = await pool.execute(
      `SELECT j.*, u.name as employee_name, v.vehicle_number, v.customer_name, v.vehicle_type, v.color
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.status = 'pending'
       ORDER BY j.created_at DESC`
    );

    res.json({ jobs });
  } catch (error) {
    console.error('Get pending jobs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const [jobs] = await pool.execute(
      `SELECT j.*, u.name as employee_name, v.*
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.id = ?`,
      [req.params.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ job: jobs[0] });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/jobs/:id/review
// @desc    Review job (admin)
// @access  Private (Admin)
router.put('/:id/review', protect, authorize('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'back' or 'proceed'

    if (action === 'proceed') {
      await pool.execute(
        'UPDATE jobs SET status = ? WHERE id = ?',
        ['reviewed', req.params.id]
      );
    }

    const [jobs] = await pool.execute(
      `SELECT j.*, u.name as employee_name, v.*
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.id = ?`,
      [req.params.id]
    );

    res.json({
      message: action === 'proceed' ? 'Job reviewed successfully' : 'Job review cancelled',
      job: jobs[0]
    });
  } catch (error) {
    console.error('Review job error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/jobs/employee/my-jobs
// @desc    Get employee's jobs
// @access  Private (Employee)
router.get('/employee/my-jobs', protect, authorize('employee'), async (req, res) => {
  try {
    const [jobs] = await pool.execute(
      `SELECT j.*, v.vehicle_number, v.customer_name
       FROM jobs j
       LEFT JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.employee_id = ?
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );

    res.json({ jobs });
  } catch (error) {
    console.error('Get employee jobs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
