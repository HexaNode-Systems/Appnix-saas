const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/appnix_saas' });

async function checkEnum() {
  const res = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentOrderStatus'
    ORDER BY e.enumsortorder;
  `);
  console.log('PaymentOrderStatus enum labels:', res.rows);
  await pool.end();
}

checkEnum().catch(e => { console.error(e); pool.end(); });
