const express = require('express');
const pool = require('../config/database');
const { protect, authorize } = require('../middleware/auth');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const router = express.Router();

// @route   POST /api/quotations
// @desc    Create quotation (admin)
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { job_id, vehicle_number, customer_name, telephone, vehicle_type, color, jobs_done, insurance_company } = req.body;

    if (!job_id || !vehicle_number) {
      return res.status(400).json({ message: 'Job ID and vehicle number are required' });
    }

    // Get job details
    const [jobs] = await pool.execute(
      'SELECT * FROM jobs WHERE id = ?',
      [job_id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = jobs[0];

    // Get or create vehicle
    let [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );

    let vehicleId;
    if (vehicles.length === 0) {
      // Create new vehicle
      const [vehicleResult] = await pool.execute(
        `INSERT INTO vehicles (vehicle_number, customer_name, telephone, vehicle_type, color, insurance_company)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [vehicle_number, customer_name || null, telephone || null, vehicle_type || null, color || null, insurance_company || null]
      );
      vehicleId = vehicleResult.insertId;
    } else {
      vehicleId = vehicles[0].id;
      // Update vehicle if needed
      if (customer_name || telephone || vehicle_type || color) {
        await pool.execute(
          `UPDATE vehicles SET customer_name = COALESCE(?, customer_name), 
           telephone = COALESCE(?, telephone), vehicle_type = COALESCE(?, vehicle_type), 
           color = COALESCE(?, color), insurance_company = COALESCE(?, insurance_company)
           WHERE id = ?`,
          [customer_name, telephone, vehicle_type, color, insurance_company, vehicleId]
        );
      }
    }

    // Link job to vehicle
    await pool.execute(
      'UPDATE jobs SET vehicle_id = ? WHERE id = ?',
      [vehicleId, job_id]
    );

    // Generate quotation number
    const [counterResult] = await pool.execute(
      'UPDATE quotation_counter SET last_quotation_number = last_quotation_number + 1'
    );
    const [counter] = await pool.execute('SELECT last_quotation_number FROM quotation_counter LIMIT 1');
    const quotationNumber = `QUO-${String(counter[0].last_quotation_number).padStart(6, '0')}`;

    // Create quotation
    const [result] = await pool.execute(
      `INSERT INTO quotations (quotation_number, job_id, vehicle_id, admin_id, vehicle_number, customer_name, 
       telephone, vehicle_type, color, job_type, jobs_done, insurance_company, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        quotationNumber,
        job_id,
        vehicleId,
        req.user.id,
        vehicle_number,
        customer_name || null,
        telephone || null,
        vehicle_type || null,
        color || null,
        job.job_type,
        JSON.stringify(jobs_done || []),
        insurance_company || null
      ]
    );

    const [newQuotation] = await pool.execute(
      `SELECT q.*, j.initial_images, j.after_images, j.special_notes, j.parts_replaced
       FROM quotations q
       LEFT JOIN jobs j ON q.job_id = j.id
       WHERE q.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Quotation created successfully',
      quotation: newQuotation[0]
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/quotations
// @desc    Get quotations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = `SELECT q.*, u1.name as admin_name, u2.name as manager_name, v.customer_name as vehicle_customer_name
                 FROM quotations q
                 LEFT JOIN users u1 ON q.admin_id = u1.id
                 LEFT JOIN users u2 ON q.manager_id = u2.id
                 LEFT JOIN vehicles v ON q.vehicle_id = v.id`;

    if (req.user.role === 'admin') {
      query += ' WHERE q.admin_id = ?';
      const [quotations] = await pool.execute(query, [req.user.id]);
      return res.json({ quotations });
    } else if (req.user.role === 'manager') {
      query += " WHERE q.status = 'sent_to_manager' OR q.manager_id = ?";
      const [quotations] = await pool.execute(query, [req.user.id]);
      return res.json({ quotations });
    }

    const [quotations] = await pool.execute(query);
    res.json({ quotations });
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/quotations/pending-manager
// @desc    Get quotations pending manager review
// @access  Private (Manager)
router.get('/pending-manager', protect, authorize('manager'), async (req, res) => {
  try {
    const [quotations] = await pool.execute(
      `SELECT q.*, u1.name as admin_name, v.customer_name as vehicle_customer_name, j.special_notes, j.initial_images, j.after_images
       FROM quotations q
       LEFT JOIN users u1 ON q.admin_id = u1.id
       LEFT JOIN vehicles v ON q.vehicle_id = v.id
       LEFT JOIN jobs j ON q.job_id = j.id
       WHERE q.status = 'sent_to_manager'
       ORDER BY q.created_at DESC`
    );

    res.json({ quotations });
  } catch (error) {
    console.error('Get pending quotations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/quotations/:id
// @desc    Get single quotation
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const [quotations] = await pool.execute(
      `SELECT q.*, u1.name as admin_name, u2.name as manager_name, j.*, v.*
       FROM quotations q
       LEFT JOIN users u1 ON q.admin_id = u1.id
       LEFT JOIN users u2 ON q.manager_id = u2.id
       LEFT JOIN jobs j ON q.job_id = j.id
       LEFT JOIN vehicles v ON q.vehicle_id = v.id
       WHERE q.id = ?`,
      [req.params.id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.json({ quotation: quotations[0] });
  } catch (error) {
    console.error('Get quotation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/quotations/:id
// @desc    Update quotation
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { prices, labor_cost, customer_name, telephone, jobs_done } = req.body;

    // Get current quotation
    const [quotations] = await pool.execute(
      'SELECT * FROM quotations WHERE id = ?',
      [req.params.id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const quotation = quotations[0];

    // Calculate total
    let totalAmount = parseFloat(labor_cost || 0);
    if (prices && Array.isArray(prices)) {
      prices.forEach(price => {
        totalAmount += parseFloat(price.amount || 0);
      });
    }

    // Update quotation
    const updateFields = [];
    const updateValues = [];

    if (prices) {
      updateFields.push('prices = ?');
      updateValues.push(JSON.stringify(prices));
    }

    if (labor_cost !== undefined) {
      updateFields.push('labor_cost = ?');
      updateValues.push(labor_cost);
    }

    if (customer_name) {
      updateFields.push('customer_name = ?');
      updateValues.push(customer_name);
    }

    if (telephone) {
      updateFields.push('telephone = ?');
      updateValues.push(telephone);
    }

    if (jobs_done) {
      updateFields.push('jobs_done = ?');
      updateValues.push(JSON.stringify(jobs_done));
    }

    updateFields.push('total_amount = ?');
    updateValues.push(totalAmount);

    if (req.user.role === 'manager') {
      updateFields.push('manager_id = ?');
      updateValues.push(req.user.id);
    }

    updateValues.push(req.params.id);

    await pool.execute(
      `UPDATE quotations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updated] = await pool.execute(
      'SELECT * FROM quotations WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Quotation updated successfully', quotation: updated[0] });
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/quotations/:id/send-to-manager
// @desc    Send quotation to manager (admin)
// @access  Private (Admin)
router.put('/:id/send-to-manager', protect, authorize('admin'), async (req, res) => {
  try {
    await pool.execute(
      "UPDATE quotations SET status = 'sent_to_manager' WHERE id = ?",
      [req.params.id]
    );

    res.json({ message: 'Quotation sent to manager successfully' });
  } catch (error) {
    console.error('Send to manager error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/quotations/:id/generate-pdf
// @desc    Generate PDF for quotation (manager)
// @access  Private (Manager)
router.post('/:id/generate-pdf', protect, authorize('manager'), async (req, res) => {
  try {
    const [quotations] = await pool.execute(
      `SELECT q.*, j.special_notes, j.initial_images, j.after_images, j.parts_replaced, v.*
       FROM quotations q
       LEFT JOIN jobs j ON q.job_id = j.id
       LEFT JOIN vehicles v ON q.vehicle_id = v.id
       WHERE q.id = ?`,
      [req.params.id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const quotation = quotations[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotation_number}.pdf`);
    
    doc.pipe(res);

    // PDF Content
    doc.fontSize(24).text('JAYAKODY AUTO ELECTRICAL', { align: 'center' });
    doc.fontSize(20).text('QUOTATION', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Quotation Number: ${quotation.quotation_number}`, { align: 'left' });
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, { align: 'left' });
    doc.moveDown();

    doc.fontSize(16).text('Vehicle Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Vehicle Number: ${quotation.vehicle_number}`);
    if (quotation.customer_name) doc.text(`Customer Name: ${quotation.customer_name}`);
    if (quotation.telephone) doc.text(`Telephone: ${quotation.telephone}`);
    if (quotation.vehicle_type) doc.text(`Vehicle Type: ${quotation.vehicle_type}`);
    if (quotation.color) doc.text(`Color: ${quotation.color}`);
    if (quotation.insurance_company) doc.text(`Insurance Company: ${quotation.insurance_company}`);
    doc.moveDown();

    doc.fontSize(16).text('Job Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Job Type: ${quotation.job_type.replace('_', ' ').toUpperCase()}`);
    if (quotation.special_notes) {
      doc.text(`Special Notes: ${quotation.special_notes}`);
    }
    doc.moveDown();

    // Jobs done and prices
    let jobsDone = [];
    try {
      jobsDone = quotation.jobs_done ? (typeof quotation.jobs_done === 'string' ? JSON.parse(quotation.jobs_done) : quotation.jobs_done) : [];
    } catch (e) {
      jobsDone = [];
    }

    if (jobsDone.length > 0) {
      doc.fontSize(16).text('Services/Repairs', { underline: true });
      doc.fontSize(12);
      jobsDone.forEach((job, index) => {
        doc.text(`${index + 1}. ${typeof job === 'string' ? job : job.description || job}`);
      });
      doc.moveDown();
    }

    // Prices
    let prices = [];
    try {
      prices = quotation.prices ? (typeof quotation.prices === 'string' ? JSON.parse(quotation.prices) : quotation.prices) : [];
    } catch (e) {
      prices = [];
    }

    if (prices.length > 0) {
      doc.fontSize(16).text('Pricing Details', { underline: true });
      doc.fontSize(12);
      prices.forEach((price, index) => {
        doc.text(`${price.description || `Item ${index + 1}`}: Rs. ${parseFloat(price.amount || 0).toFixed(2)}`);
      });
      doc.moveDown();
    }

    if (quotation.labor_cost) {
      doc.text(`Labor Cost: Rs. ${parseFloat(quotation.labor_cost).toFixed(2)}`);
    }

    doc.moveDown();
    doc.fontSize(18).text(`Total Amount: Rs. ${parseFloat(quotation.total_amount || 0).toFixed(2)}`, { align: 'right', bold: true });

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// @route   POST /api/quotations/:id/approve
// @desc    Approve quotation and notify admin (manager)
// @access  Private (Manager)
router.post('/:id/approve', protect, authorize('manager'), async (req, res) => {
  try {
    const { message } = req.body;

    // Update quotation status
    await pool.execute(
      "UPDATE quotations SET status = 'approved' WHERE id = ?",
      [req.params.id]
    );

    // Get quotation details
    const [quotations] = await pool.execute(
      'SELECT * FROM quotations WHERE id = ?',
      [req.params.id]
    );

    const quotation = quotations[0];

    // Create notification for admin
    const adminId = quotation.admin_id;
    if (adminId) {
      await pool.execute(
        `INSERT INTO notifications (from_user_id, to_user_id, type, message, quotation_id, vehicle_number)
         VALUES (?, ?, 'quotation_ready', ?, ?, ?)`,
        [req.user.id, adminId, message || 'Quotation is ready', req.params.id, quotation.vehicle_number]
      );
    }

    res.json({ message: 'Quotation approved and notification sent to admin' });
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
