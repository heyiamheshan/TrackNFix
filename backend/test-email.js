// Test email configuration
// Run this script to test if your email setup is working: node test-email.js

require('dotenv').config();
const { sendEmail } = require('./utils/emailService');

async function testEmail() {
  console.log('\n🧪 Testing Email Configuration...\n');
  
  const testEmail = process.env.EMAIL_USER || 'test@example.com';
  const testSubject = 'Test Email from TrackNFix';
  const testHtml = `
    <h2>Email Test</h2>
    <p>If you receive this email, your email configuration is working correctly!</p>
    <p>This is a test email from Jayakody Auto Electricals system.</p>
  `;

  console.log('Sending test email to:', testEmail);
  const result = await sendEmail(testEmail, testSubject, testHtml);

  if (result.success) {
    console.log('\n✅ SUCCESS! Email sent successfully.');
    console.log('Check your inbox (and spam folder) for the test email.\n');
  } else {
    console.log('\n❌ FAILED! Email could not be sent.');
    console.log('Error:', result.error);
    console.log('\nCommon issues:');
    console.log('1. Check if EMAIL_USER and EMAIL_PASS are set in .env file');
    console.log('2. For Gmail, make sure you\'re using an App Password (not your regular password)');
    console.log('3. Enable "Less secure app access" or use App Passwords if 2FA is enabled');
    console.log('4. Check your internet connection\n');
  }
}

testEmail().catch(console.error);
