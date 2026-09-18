async function run() {
  console.log("=== PRODUCTION LIVE SANITY CHECK ===");

  const randomSuffix = Date.now().toString().slice(-4);
  const testEmail = `sanity-${randomSuffix}@appnix-test.com`;

  // 1. Register a direct client on app.appnix.co.in
  console.log("\n1. Testing Signup on app.appnix.co.in:");
  const signupRes = await fetch("http://localhost:4000/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "app.appnix.co.in"
    },
    body: JSON.stringify({
      email: testEmail,
      password: "TestPassword123!",
      name: "Prod Sanity User",
      workspaceName: "Prod Direct Workspace"
    })
  });
  const signupData = await signupRes.json();
  const cookies = signupRes.headers.get("set-cookie") || "";
  console.log("Signup Status:", signupRes.status);
  console.log("Raw Role:", signupData.data?.user?.rawRole);
  console.log("Tenant ID:", signupData.data?.user?.tenantId);
  console.log("Redirect URL:", signupData.data?.redirectUrl);
  console.log("Admin token in cookies:", cookies.includes("appnix_admin_token"));
  console.log("Cookie domain specified:", cookies.includes("Domain="));

  const isClientRole = signupData.data?.user?.rawRole === "CLIENT_USER";
  const isDirectTenant = signupData.data?.user?.tenantId === "APPNIX_DIRECT";
  const isDashboardRedirect = signupData.data?.redirectUrl === "/dashboard";
  const noAdminCookie = !cookies.includes("appnix_admin_token");
  const noWildcardDomain = !cookies.includes("Domain=");

  if (isClientRole && isDirectTenant && isDashboardRedirect && noAdminCookie && noWildcardDomain) {
    console.log(">>> [PASS] Direct client signup on app.appnix.co.in correctly provisioned as CLIENT_USER under APPNIX_DIRECT with redirectUrl=/dashboard and host-only cookies!");
  } else {
    console.error(">>> [FAIL] Direct client signup failed checks:", signupData);
    process.exit(1);
  }

  // 2. Try logging into partners.appnix.co.in with this client credential
  console.log("\n2. Testing Cross-Panel Block on partners.appnix.co.in:");
  const partnerLoginRes = await fetch("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "partners.appnix.co.in"
    },
    body: JSON.stringify({
      email: testEmail,
      password: "TestPassword123!"
    })
  });
  const partnerLoginData = await partnerLoginRes.json();
  console.log("Partner Login Status:", partnerLoginRes.status);
  console.log("Partner Login Message:", partnerLoginData.message);

  if (partnerLoginRes.status === 403 && partnerLoginData.message.includes("Client accounts cannot access partner console")) {
    console.log(">>> [PASS] Cross-panel login block verified! Client account rejected on partners.appnix.co.in with 403: Client accounts cannot access partner console.");
  } else {
    console.error(">>> [FAIL] Partner login expected 403 Forbidden:", partnerLoginData);
    process.exit(1);
  }

  // 3. Try logging into app.appnix.co.in with this client credential
  console.log("\n3. Testing Direct Client Login on app.appnix.co.in:");
  const appLoginRes = await fetch("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "app.appnix.co.in"
    },
    body: JSON.stringify({
      email: testEmail,
      password: "TestPassword123!"
    })
  });
  const appLoginData = await appLoginRes.json();
  console.log("App Login Status:", appLoginRes.status);
  console.log("App Login Redirect:", appLoginData.data?.redirectUrl);
  if (appLoginRes.status === 200 && appLoginData.data?.redirectUrl === "/dashboard") {
    console.log(">>> [PASS] Client login on app.appnix.co.in succeeds with redirectUrl=/dashboard!");
  } else {
    console.error(">>> [FAIL] App login failed:", appLoginData);
    process.exit(1);
  }

  // 4. Verify Super Admin Guest Impersonation functionality remains operational
  console.log("\n4. Testing Super Admin Impersonation API:");
  const impHealthRes = await fetch("http://localhost:4000/api/v1/super-admin/impersonate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "superadmin.appnix.co.in"
    },
    body: JSON.stringify({
      targetUserId: "test-user-id",
      reason: "Production sanity check"
    })
  });
  console.log("Impersonation Status (Expected 401 Unauthorized without bearer token):", impHealthRes.status);
  if (impHealthRes.status === 401) {
    console.log(">>> [PASS] Super Admin impersonation endpoint responds with expected 401 Unauthorized guard (active and intact)!");
  } else {
    console.error(">>> [FAIL] Unexpected status from impersonation endpoint:", impHealthRes.status);
    process.exit(1);
  }

  console.log("\n=== ALL PRODUCTION LIVE CHECKS COMPLETED SUCCESSFULLY ===");
}
run();
