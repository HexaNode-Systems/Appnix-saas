const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/appnix_saas' });

const JWT_ACCESS_SECRET = '89b43312a305cbeb37f5e2cfd37f9277f06a8facd4ae42df477acefe5cab39009dcc9093de18ab270297751b69ae0111f0949dadec9b4dd3efed51e2c2b27f85';
const BACKEND_URL = 'http://localhost:4000/api/v1';

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tier: user.tier || 'END_CLIENT',
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
}

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('RUNNING CLIENT SUBSCRIPTION VERIFICATION SUITE — ALL 10 CASES');
  console.log('===============================================================\n');

  // Load test users
  const usersRes = await pool.query(`
    SELECT u.id, u.email, u.role, u."tenantId", t.name as "tenantName", t.tier, t."parentId"
    FROM users u
    LEFT JOIN tenants t ON u."tenantId" = t.id
    WHERE u.email IN ('harshit01@yopmail.com', 'harshit28k@gmail.com', 'harshit@yopmail.com', 'superadmin@appnix.co.in');
  `);
  const userMap = {};
  for (const row of usersRes.rows) {
    userMap[row.email] = row;
  }

  const clientWithActive = userMap['harshit01@yopmail.com'];
  const clientWithoutSub = userMap['harshit28k@gmail.com'];
  const resellerAdmin = userMap['harshit@yopmail.com'];
  const superAdmin = userMap['superadmin@appnix.co.in'];

  // -------------------------------------------------------------
  // CASE 1: Client logs in with ACTIVE subscription -> /dashboard
  // -------------------------------------------------------------
  console.log('--- CASE 1: Client with ACTIVE subscription ---');
  {
    // Ensure client has active subscription
    const token = createToken(clientWithActive);
    const res = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.ok, 'API returns 200 OK');
    assert(res.data.hasActiveSubscription === true, 'hasActiveSubscription is true');
    assert(res.data.data?.status === 'ACTIVE', 'status is ACTIVE');
    const destination = res.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/dashboard', 'Client is directed to /dashboard');
  }

  // -------------------------------------------------------------
  // CASE 2: Client logs in with NO subscription -> /subscription
  // -------------------------------------------------------------
  console.log('\n--- CASE 2: Client with NO subscription ---');
  {
    // Ensure clientWithoutSub has no active subscription
    await pool.query(`DELETE FROM subscriptions WHERE "tenantId" = $1;`, [clientWithoutSub.tenantId]);
    const token = createToken(clientWithoutSub);
    const res = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.ok, 'API returns 200 OK');
    assert(res.data.hasActiveSubscription === false, 'hasActiveSubscription is false');
    assert(res.data.data === null, 'data is null');
    const destination = res.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/subscription', 'Client is directed to /subscription');
  }

  // -------------------------------------------------------------
  // CASE 3: Client with EXPIRED subscription -> /subscription
  // -------------------------------------------------------------
  console.log('\n--- CASE 3: Client with EXPIRED subscription ---');
  {
    const subId = `sub_test_exp_${Date.now()}`;
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    await pool.query(`
      INSERT INTO subscriptions (
        id, "tenantId", "planId", "planName", price, status,
        "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, 'starter', 'Starter Tier', '₹999/mo', 'ACTIVE', 30, 0, $3, $4, NOW(), NOW());
    `, [subId, clientWithoutSub.tenantId, new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000), pastDate]);

    const token = createToken(clientWithoutSub);
    const res = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.ok, 'API returns 200 OK');
    assert(res.data.hasActiveSubscription === false, 'hasActiveSubscription is false');
    assert(res.data.isExpired === true, 'isExpired is true');
    assert(res.data.data?.status === 'EXPIRED', 'Status evaluated and marked EXPIRED in response');

    // Verify DB was updated to PAST_DUE (PostgreSQL SubscriptionStatus enum representation of expired)
    const dbSub = await pool.query(`SELECT status FROM subscriptions WHERE id = $1;`, [subId]);
    assert(dbSub.rows[0]?.status === 'PAST_DUE', 'Subscription status updated to PAST_DUE in PostgreSQL');

    const destination = res.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/subscription', 'Client is directed to /subscription with expired notice');

    // Clean up
    await pool.query(`DELETE FROM subscriptions WHERE id = $1;`, [subId]);
  }

  // -------------------------------------------------------------
  // CASE 4: Client with CANCELLED subscription -> /subscription
  // -------------------------------------------------------------
  console.log('\n--- CASE 4: Client with CANCELLED subscription ---');
  {
    const subId = `sub_test_canc_${Date.now()}`;
    await pool.query(`
      INSERT INTO subscriptions (
        id, "tenantId", "planId", "planName", price, status,
        "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, 'starter', 'Starter Tier', '₹999/mo', 'CANCELLED', 30, 0, NOW(), NOW(), NOW(), NOW());
    `, [subId, clientWithoutSub.tenantId]);

    const token = createToken(clientWithoutSub);
    const res = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.ok, 'API returns 200 OK');
    assert(res.data.hasActiveSubscription === false, 'hasActiveSubscription is false');
    assert(res.data.data?.status === 'CANCELLED', 'Status is CANCELLED');
    const destination = res.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/subscription', 'Client is directed to /subscription with cancelled notice');

    // Clean up
    await pool.query(`DELETE FROM subscriptions WHERE id = $1;`, [subId]);
  }

  // -------------------------------------------------------------
  // CASE 5: Client with PENDING / FAILED subscription -> /subscription
  // -------------------------------------------------------------
  console.log('\n--- CASE 5: Client with PENDING / FAILED subscription ---');
  {
    const starterPlanRow = await pool.query(`SELECT id FROM plans WHERE slug = 'starter' LIMIT 1;`);
    const starterPlanId = starterPlanRow.rows[0]?.id || 'ee22a45a-e5b4-471f-a96c-209def2a1d4e';

    // Record pending order in payment_orders table
    const orderIdPending = `order_pend_${Date.now()}`;
    await pool.query(`
      INSERT INTO payment_orders (
        id, "orderId", "workspaceId", "planId", amount, currency, status, "createdAt", "updatedAt"
      ) VALUES ($1, $1, $2, $3, 999, 'INR', 'PENDING', NOW(), NOW());
    `, [orderIdPending, clientWithoutSub.tenantId, starterPlanId]);

    const token = createToken(clientWithoutSub);
    const res = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.ok, 'API returns 200 OK');
    assert(res.data.hasActiveSubscription === false, 'hasActiveSubscription is false for PENDING order');
    let destination = res.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/subscription', 'Client with PENDING order is directed to /subscription');

    // Record failed order in payment_orders table
    const orderIdFailed = `order_fail_${Date.now()}`;
    await pool.query(`
      INSERT INTO payment_orders (
        id, "orderId", "workspaceId", "planId", amount, currency, status, "createdAt", "updatedAt"
      ) VALUES ($1, $1, $2, $3, 999, 'INR', 'FAILED', NOW(), NOW());
    `, [orderIdFailed, clientWithoutSub.tenantId, starterPlanId]);

    const resFailed = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(resFailed.ok, 'API returns 200 OK');
    assert(resFailed.data.hasActiveSubscription === false, 'hasActiveSubscription is false for FAILED order');
    destination = resFailed.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/subscription', 'Client with FAILED order is directed to /subscription');

    // Clean up test payment orders
    await pool.query(`DELETE FROM payment_orders WHERE "workspaceId" = $1;`, [clientWithoutSub.tenantId]);
  }

  // -------------------------------------------------------------
  // CASE 6: Real plans loaded on /subscription from PostgreSQL
  // -------------------------------------------------------------
  console.log('\n--- CASE 6: Real plans loaded from PostgreSQL database ---');
  {
    // Client under reseller (clientWithActive has parentId = resellerAdmin.tenantId)
    const clientToken = createToken(clientWithActive);
    const clientPlansRes = await fetchJson('/billing/plans', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });

    assert(clientPlansRes.ok, 'GET /billing/plans returned 200 OK');
    assert(Array.isArray(clientPlansRes.data.data), 'Returns array of plans');
    const plans = clientPlansRes.data.data;
    assert(plans.length > 0, `Plans count: ${plans.length}`);
    const planNames = plans.map(p => p.name);
    console.log('    Client sees plans:', planNames);
    assert(planNames.includes('Trail'), 'Reseller-scoped plan "Trail" is returned for end client');

    // Direct / public request returns platform plans
    const publicPlansRes = await fetchJson('/billing/plans');
    const publicPlans = publicPlansRes.data.data;
    assert(publicPlans.some(p => p.slug === 'starter'), 'Platform Starter plan is present in public plans');
    assert(publicPlans.some(p => p.slug === 'pro'), 'Platform Pro plan is present in public plans');
    assert(publicPlans.some(p => p.slug === 'enterprise'), 'Platform Enterprise plan is present in public plans');
  }

  // -------------------------------------------------------------
  // CASE 7: Admin creates new plan -> immediately visible to client
  // -------------------------------------------------------------
  console.log('\n--- CASE 7: Admin creates new plan -> immediately visible to client ---');
  let createdPlanId = null;
  {
    const resellerToken = createToken(resellerAdmin);
    const planSlug = `test-vip-${Date.now()}`;
    const createRes = await fetchJson('/billing/plans', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resellerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'VIP Enterprise Automated',
        slug: planSlug,
        description: 'Instant VIP tier for test',
        price: 4999,
        monthlyPrice: 4999,
        yearlyPrice: 49990,
        currency: 'INR',
        features: ['VIP Dedicated Line', 'Unlimited Flow Builder'],
        isPopular: true,
      }),
    });

    assert(createRes.ok, 'POST /billing/plans created plan successfully');
    createdPlanId = createRes.data.data?.id;
    assert(Boolean(createdPlanId), `Created plan ID: ${createdPlanId}`);

    // Client immediately queries plans
    const clientToken = createToken(clientWithActive);
    const clientPlansRes = await fetchJson('/billing/plans', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const foundNewPlan = clientPlansRes.data.data?.some(p => p.name === 'VIP Enterprise Automated');
    assert(foundNewPlan, 'Newly created admin plan is immediately returned to client from PostgreSQL');

    // Delete the test plan
    if (createdPlanId) {
      await fetchJson(`/billing/plans/${createdPlanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${resellerToken}` },
      });
    }
  }

  // -------------------------------------------------------------
  // CASE 8: Client selects plan -> Cashfree verified -> DB ACTIVE -> /dashboard
  // -------------------------------------------------------------
  console.log('\n--- CASE 8: Payment verified -> DB ACTIVE subscription -> /dashboard ---');
  {
    const orderId = `order_test_${Date.now()}`;
    const paymentId = `cf_pay_test_${Date.now()}`;
    const token = createToken(clientWithoutSub);

    // Call activate-payment endpoint (simulating Cashfree verify callback)
    const activateRes = await fetchJson('/billing/activate-payment', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        paymentId,
        planId: 'pro',
        amount: 2999,
        billingCycle: 'monthly',
        paymentMethod: 'Cashfree UPI Simulator',
      }),
    });

    assert(activateRes.ok, 'activate-payment returns 200 OK');
    assert(activateRes.data.success === true, 'Activation response success is true');

    // Verify in PostgreSQL subscriptions table
    const dbSub = await pool.query(
      `SELECT * FROM subscriptions WHERE "tenantId" = $1 AND status = 'ACTIVE' ORDER BY "createdAt" DESC LIMIT 1;`,
      [clientWithoutSub.tenantId]
    );
    assert(dbSub.rows.length === 1, 'ACTIVE subscription created in PostgreSQL');
    assert(dbSub.rows[0]?.planName === 'Professional Tier', 'Plan name is Professional Tier');
    assert(dbSub.rows[0]?.stripeSubscriptionId === orderId, 'Order ID recorded in subscription');

    // Verify in PostgreSQL invoices table
    const dbInv = await pool.query(
      `SELECT * FROM invoices WHERE "tenantId" = $1 AND "invoiceNumber" = $2;`,
      [clientWithoutSub.tenantId, orderId]
    );
    assert(dbInv.rows.length === 1, 'Tax invoice created in PostgreSQL invoices table');
    assert(dbInv.rows[0]?.status === 'Paid', 'Invoice status is Paid');

    // Client verifies status
    const statusRes = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(statusRes.data.hasActiveSubscription === true, 'Client status now hasActiveSubscription = true');
    const destination = statusRes.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/dashboard', 'Client is now directed to /dashboard');
  }

  // -------------------------------------------------------------
  // CASE 9: Browser refresh preserves real DB subscription state
  // -------------------------------------------------------------
  console.log('\n--- CASE 9: Page refresh preserves real DB subscription state ---');
  {
    // Simulating page refresh by re-issuing status query with same session
    const token = createToken(clientWithoutSub);
    const refreshRes = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(refreshRes.ok, 'Query returns 200 OK on refresh');
    assert(refreshRes.data.hasActiveSubscription === true, 'hasActiveSubscription remains true after refresh');
    assert(refreshRes.data.data?.status === 'ACTIVE', 'status remains ACTIVE in PostgreSQL');
    const destination = refreshRes.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/dashboard', 'Still directed to /dashboard (not redirected back to /subscription)');
  }

  // -------------------------------------------------------------
  // CASE 10: Logout and re-login determines correct destination
  // -------------------------------------------------------------
  console.log('\n--- CASE 10: Logout and re-login determines correct destination ---');
  {
    // Simulate user logging out (token discarded)
    // Then logging back in: a fresh token is minted
    const newSessionToken = createToken(clientWithoutSub);
    const loginRes = await fetchJson('/billing/subscription', {
      headers: { Authorization: `Bearer ${newSessionToken}` },
    });

    assert(loginRes.ok, 'Re-login status check returns 200 OK');
    assert(loginRes.data.hasActiveSubscription === true, 'Re-login confirms active subscription in PostgreSQL');
    const destination = loginRes.data.hasActiveSubscription ? '/dashboard' : '/subscription';
    assert(destination === '/dashboard', 'Client is directed to /dashboard on fresh login');

    // Clean up test subscription created for clientWithoutSub
    await pool.query(`DELETE FROM invoices WHERE "tenantId" = $1;`, [clientWithoutSub.tenantId]);
    await pool.query(`DELETE FROM subscriptions WHERE "tenantId" = $1;`, [clientWithoutSub.tenantId]);
    console.log('    Cleaned up test subscription records for harshit28k@gmail.com.');
  }

  console.log('\n===============================================================');
  console.log(`TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  await pool.end();
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  pool.end();
  process.exit(1);
});
