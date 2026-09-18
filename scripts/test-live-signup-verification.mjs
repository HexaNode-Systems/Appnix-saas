async function testLiveSignup() {
  console.log("=== TESTING LIVE HTTPS SIGNUP ON API.APPNIX.CO.IN ===");

  const timestamp = Date.now().toString().slice(-4);
  const testEmail = `test_direct_${timestamp}@appnix.co.in`;

  // Test 1: Direct signup via https://api.appnix.co.in with x-forwarded-host: app.appnix.co.in
  console.log("\n--- Test 1: with x-forwarded-host ---");
  const res1 = await fetch("https://api.appnix.co.in/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "app.appnix.co.in",
      "Origin": "https://app.appnix.co.in",
    },
    body: JSON.stringify({
      email: testEmail,
      password: "Password@123",
      fullName: "Direct Test",
      workspaceName: "Direct Workspace",
    }),
  });

  const body1 = await res1.json();
  console.log("Response 1 Status:", res1.status);
  if (res1.status !== 201) {
    console.error("Test 1 failed:", body1);
    process.exit(1);
  }
  console.log("Role 1:", body1.data?.user?.rawRole);
  console.log("TenantId 1:", body1.data?.user?.tenantId);
  console.log("RedirectUrl 1:", body1.data?.redirectUrl);

  // Test 2: Direct signup via https://api.appnix.co.in with ONLY Origin header (browser standard)
  console.log("\n--- Test 2: with ONLY Origin header (no x-forwarded-host) ---");
  const testEmail2 = `test_origin_${timestamp}@appnix.co.in`;
  const res2 = await fetch("https://api.appnix.co.in/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://app.appnix.co.in",
    },
    body: JSON.stringify({
      email: testEmail2,
      password: "Password@123",
      fullName: "Origin Tester",
      workspaceName: "Origin Workspace",
    }),
  });

  const body2 = await res2.json();
  console.log("Response 2 Status:", res2.status);
  if (res2.status !== 201) {
    console.error("Test 2 failed:", body2);
    process.exit(1);
  }
  console.log("Role 2:", body2.data?.user?.rawRole);
  console.log("TenantId 2:", body2.data?.user?.tenantId);
  console.log("RedirectUrl 2:", body2.data?.redirectUrl);
}

testLiveSignup().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
