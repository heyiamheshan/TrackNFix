// Check and fix database schema
// Run this script to verify your database has all required columns: node check-database.js

require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  
  try {
    console.log('\n🔍 Checking database schema...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tracknfix',
    });

    // Check if reset_password_otp column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'reset_password_otp'
    `, [process.env.DB_NAME || 'tracknfix']);

    if (columns.length === 0) {
      console.log('❌ Missing column: reset_password_otp');
      console.log('📝 Adding missing columns...\n');
      
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_otp VARCHAR(255) NULL,
        ADD COLUMN reset_password_expires DATETIME NULL
      `);
      
      console.log('✅ Successfully added reset_password_otp and reset_password_expires columns!\n');
    } else {
      console.log('✅ Column reset_password_otp exists');
      
      // Check reset_password_expires
      const [expiresColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'reset_password_expires'
      `, [process.env.DB_NAME || 'tracknfix']);
      
      if (expiresColumns.length === 0) {
        console.log('❌ Missing column: reset_password_expires');
        console.log('📝 Adding missing column...\n');
        
        await connection.execute(`
          ALTER TABLE users 
          ADD COLUMN reset_password_expires DATETIME NULL
        `);
        
        console.log('✅ Successfully added reset_password_expires column!\n');
      } else {
        console.log('✅ Column reset_password_expires exists\n');
      }
    }

    console.log('✅ Database schema check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('\nPlease make sure:');
    console.log('1. Your MySQL server is running');
    console.log('2. Your .env file has correct database credentials');
    console.log('3. The database "tracknfix" exists\n');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();
