const { Client } = require('pg');

// Hard-code connection for quick check
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkUsersSchema() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check users table schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Users table does not exist');
    } else {
      console.log('✓ Users table schema:');
      console.table(result.rows);
    }

    // Check if there's an id column that's UUID
    const idColumn = result.rows.find(row => row.column_name === 'id');
    if (idColumn) {
      console.log(`\n✓ ID column type: ${idColumn.data_type}`);
    }

    // Check if firebase_uid exists
    const firebaseColumn = result.rows.find(row => row.column_name === 'firebase_uid');
    if (firebaseColumn) {
      console.log(`✓ Firebase UID column type: ${firebaseColumn.data_type}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkUsersSchema();
