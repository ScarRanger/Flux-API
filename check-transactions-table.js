const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_xUmYT5QX6MRu@ep-hidden-mud-a13ssgdh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTransactionsTable() {
  try {
    // Check if transactions table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'transactions'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Transactions table exists\n');
      
      // Check its columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        ORDER BY ordinal_position
      `);
      
      console.log('Transactions table schema:');
      columns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('✗ Transactions table does NOT exist');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionsTable();
