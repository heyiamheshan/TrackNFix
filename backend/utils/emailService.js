// backend/utils/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Verify email configuration on startup
console.log('📧 Email Service Configuration:');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail (default)');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');

// Create transporter with better error handling
let transporter;

// Initialize transporter
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    if (process.env.EMAIL_SERVICE === 'gmail' || !process.env.EMAIL_SERVICE) {
      // Gmail configuration
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log('✅ Gmail transporter created');
      
      // Verify connection once on startup (optional, can be slow)
      transporter.verify().then(() => {
        console.log('✅ Email server connection verified');
      }).catch((err) => {
        console.warn('⚠️  Email server verification failed (emails may still work):', err.message);
      });
    } else {
      // Custom SMTP configuration
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      console.log('✅ Custom SMTP transporter created');
    }
  } catch (error) {
    console.error('❌ Error creating email transporter:', error.message);
  }
} else {
  console.warn('⚠️  Email credentials not configured. Email features will not work.');
}

const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const errorMsg = 'Email service not configured. Please set EMAIL_USER and EMAIL_PASS in .env file';
      console.error('❌', errorMsg);
      return { 
        success: false, 
        error: errorMsg
      };
    }

    // Verify transporter exists
    if (!transporter) {
      const errorMsg = 'Email transporter not initialized. Check your email configuration.';
      console.error('❌', errorMsg);
      return { 
        success: false, 
        error: errorMsg
      };
    }

    // Skip verification on every send (it's slow) - just try to send
    // Verification happens once on server startup
    console.log(`📧 Attempting to send email to ${to}...`);
    
    const mailOptions = {
      from: `"Jayakody Auto Electricals" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log('Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    let errorMsg = error.message;
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      errorMsg = 'Authentication failed. Check your email credentials. For Gmail, use an App Password if 2FA is enabled.';
    } else if (error.code === 'ECONNECTION') {
      errorMsg = 'Connection failed. Check your internet connection and email server settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg = 'Connection timeout. Email server may be unreachable.';
    }
    
    return { success: false, error: errorMsg, code: error.code };
  }
};

module.exports = { sendEmail };