const express = require('express');
const pool = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/vehicles/search
// @desc    Search vehicle by number or telephone
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { vehicle_number, telephone, query: searchQuery } = req.query;

    let sqlQuery = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (searchQuery) {
      sqlQuery += ' AND (vehicle_number LIKE ? OR telephone LIKE ? OR customer_name LIKE ?)';
      const likeParam = `%${searchQuery}%`;
      params.push(likeParam, likeParam, likeParam);
    } else {
      if (vehicle_number) {
        sqlQuery += ' AND vehicle_number LIKE ?';
        params.push(`%${vehicle_number}%`);
      }

      if (telephone) {
        sqlQuery += ' AND telephone LIKE ?';
        params.push(`%${telephone}%`);
      }
    }

    const [vehicles] = await pool.execute(sqlQuery, params);

    res.json({ vehicles });
  } catch (error) {
    console.error('Search vehicle error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vehicles/:vehicleNumber
// @desc    Get vehicle by vehicle number
// @access  Private
router.get('/:vehicleNumber', protect, async (req, res) => {
  try {
    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [req.params.vehicleNumber]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ vehicle: vehicles[0] });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vehicles/:vehicleNumber/history
// @desc    Get vehicle service history
// @access  Private
router.get('/:vehicleNumber/history', protect, async (req, res) => {
  try {
    const [vehicles] = await pool.execute(
      'SELECT id FROM vehicles WHERE vehicle_number = ?',
      [req.params.vehicleNumber]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleId = vehicles[0].id;

    // Get all jobs for this vehicle
    const [jobs] = await pool.execute(
      `SELECT j.*, u.name as employee_name, q.id as quotation_id, q.quotation_number, q.total_amount, q.status as quotation_status
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN quotations q ON j.id = q.job_id
       WHERE j.vehicle_id = ?
       ORDER BY j.created_at DESC`,
      [vehicleId]
    );

    // Get all quotations for this vehicle
    const [quotations] = await pool.execute(
      `SELECT q.*, u1.name as admin_name, u2.name as manager_name
       FROM quotations q
       LEFT JOIN users u1 ON q.admin_id = u1.id
       LEFT JOIN users u2 ON q.manager_id = u2.id
       WHERE q.vehicle_id = ?
       ORDER BY q.created_at DESC`,
      [vehicleId]
    );

    res.json({
      vehicle: vehicles[0],
      jobs,
      quotations
    });
  } catch (error) {
    console.error('Get vehicle history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/vehicles
// @desc    Create or update vehicle
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { vehicle_number, customer_name, address, telephone, vehicle_type, color, insurance_company } = req.body;

    if (!vehicle_number) {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }

    // Check if vehicle exists
    const [existing] = await pool.execute(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );

    if (existing.length > 0) {
      // Update existing vehicle
      await pool.execute(
        `UPDATE vehicles SET customer_name = ?, address = ?, telephone = ?, vehicle_type = ?, color = ?, insurance_company = ?
         WHERE vehicle_number = ?`,
        [customer_name, address, telephone, vehicle_type, color, insurance_company, vehicle_number]
      );

      const [updated] = await pool.execute(
        'SELECT * FROM vehicles WHERE vehicle_number = ?',
        [vehicle_number]
      );

      res.json({ message: 'Vehicle updated successfully', vehicle: updated[0] });
    } else {
      // Create new vehicle
      const [result] = await pool.execute(
        `INSERT INTO vehicles (vehicle_number, customer_name, address, telephone, vehicle_type, color, insurance_company)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vehicle_number, customer_name || null, address || null, telephone || null, vehicle_type || null, color || null, insurance_company || null]
      );

      const [newVehicle] = await pool.execute(
        'SELECT * FROM vehicles WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({ message: 'Vehicle created successfully', vehicle: newVehicle[0] });
    }
  } catch (error) {
    console.error('Create/update vehicle error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/vehicles/:vehicleNumber/service-record-pdf
// @desc    Generate service record PDF (manager)
// @access  Private (Manager)
router.post('/:vehicleNumber/service-record-pdf', protect, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');

    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [req.params.vehicleNumber]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicle = vehicles[0];

    // Get all jobs and quotations for this vehicle
    const [jobs] = await pool.execute(
      `SELECT j.*, u.name as employee_name, q.quotation_number, q.total_amount, q.prices, q.labor_cost, q.status as quotation_status
       FROM jobs j
       LEFT JOIN users u ON j.employee_id = u.id
       LEFT JOIN quotations q ON j.id = q.job_id
       WHERE j.vehicle_id = ?
       ORDER BY j.created_at DESC`,
      [vehicle.id]
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=service-record-${vehicle.vehicle_number}.pdf`);

    doc.pipe(res);

    // PDF Content
    doc.fontSize(24).text('JAYAKODY AUTO ELECTRICAL', { align: 'center' });
    doc.fontSize(20).text('SERVICE RECORD', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text('Vehicle Information', { underline: true });
    doc.fontSize(12);
    doc.text(`Vehicle Number: ${vehicle.vehicle_number}`);
    if (vehicle.customer_name) doc.text(`Customer Name: ${vehicle.customer_name}`);
    if (vehicle.telephone) doc.text(`Telephone: ${vehicle.telephone}`);
    if (vehicle.vehicle_type) doc.text(`Vehicle Type: ${vehicle.vehicle_type}`);
    if (vehicle.color) doc.text(`Color: ${vehicle.color}`);
    doc.moveDown();

    doc.fontSize(16).text('Service History', { underline: true });
    doc.moveDown();

    if (jobs.length === 0) {
      doc.fontSize(12).text('No service records found.');
    } else {
      jobs.forEach((job, index) => {
        doc.fontSize(14).text(`Service #${index + 1}`, { underline: true });
        doc.fontSize(12);
        doc.text(`Job Number: ${job.job_number}`);
        doc.text(`Date: ${new Date(job.created_at).toLocaleDateString()}`);
        const jobType = job.job_type ? job.job_type.replace('_', ' ').toUpperCase() : 'N/A';
        doc.text(`Job Type: ${jobType}`);
        doc.text(`Employee: ${job.employee_name || 'N/A'}`);

        if (job.special_notes) {
          doc.text(`Notes: ${job.special_notes}`);
        }

        if (job.quotation_number) {
          doc.text(`Quotation: ${job.quotation_number}`);

          let prices = [];
          try {
            prices = job.prices ? (typeof job.prices === 'string' ? JSON.parse(job.prices) : job.prices) : [];
          } catch (e) {
            prices = [];
          }

          if (prices.length > 0) {
            doc.text('Services/Parts:');
            prices.forEach(price => {
              doc.text(`  - ${price.description}: Rs. ${parseFloat(price.amount || 0).toFixed(2)}`, { indent: 20 });
            });
          }

          if (job.labor_cost) {
            doc.text(`Labor Cost: Rs. ${parseFloat(job.labor_cost || 0).toFixed(2)}`);
          }

          if (job.total_amount) {
            doc.text(`Total: Rs. ${parseFloat(job.total_amount || 0).toFixed(2)}`, { bold: true });
          }
        }

        doc.moveDown();
        if (index < jobs.length - 1) {
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();
        }
      });
    }

    doc.end();
  } catch (error) {
    console.error('Generate service record PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

module.exports = router;
