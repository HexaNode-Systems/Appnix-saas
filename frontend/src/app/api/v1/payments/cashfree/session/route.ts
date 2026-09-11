import { NextRequest, NextResponse } from "next/server";
import { cashfree, CashfreeAPIError } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma";
import { saveStoredOrder } from "@/lib/transactions-store";
import { getAuthenticatedWorkspace } from "@/lib/server/authenticated-workspace";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedWorkspace(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
    }
    const body = await req.json();
    const {
      planId = "starter",
      customerEmail = "billing@appnix.io",
      customerPhone = "9876543210",
      customerName = "Appnix Workspace Admin",
      billingCycle = "monthly",
      returnUrl,
    } = body;
    const workspaceId = session.workspaceId;

    // 1. Retrieve Plan Details (Query Database with fallback)
    let plan: any = null;
    try {
      const planRows: any[] = await prisma.$queryRaw`
        SELECT id, name, slug, "monthlyPrice", "yearlyPrice" FROM plans WHERE slug = ${planId} OR id = ${planId} LIMIT 1;
      `;
      plan = planRows?.[0] || null;
    } catch (dbErr: any) {
      console.warn("[Cashfree Session API] Prisma plan query notice:", dbErr.message);
    }

    const cycle = (billingCycle || "monthly").toLowerCase();
    const monthlyRate = plan
      ? Number(plan.monthlyPrice || 0)
      : (planId === "enterprise" ? 8999 : planId === "pro" ? 2999 : 999);
    const resolvedPlanName =
      plan?.name ||
      (planId === "enterprise"
        ? "Enterprise Custom"
        : planId === "pro"
        ? "Professional Tier"
        : "Starter Tier");

    let amount = monthlyRate;
    if (cycle === "yearly" || cycle === "annual" || cycle === "12_months") {
      amount = plan?.yearlyPrice
        ? Number(plan.yearlyPrice)
        : (planId === "enterprise" ? 86390 : planId === "pro" ? 28790 : 9590);
    } else if (cycle === "half_yearly" || cycle === "6_months" || cycle === "semi_annual") {
      amount = Math.round(monthlyRate * 6 * 0.85);
    } else if (cycle === "quarterly" || cycle === "3_months") {
      amount = Math.round(monthlyRate * 3 * 0.9);
    } else {
      amount = monthlyRate;
    }

    // 2. Generate Unique Order ID
    const sanitizedWorkspaceId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
    const orderId = `order_${sanitizedWorkspaceId || "appnix"}_${Date.now()}`;

    // 3. Construct Return URL
    const appUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:3000";
    const resolvedReturnUrl =
      returnUrl ||
      `${appUrl}/workspace/billing/status?order_id={order_id}&plan=${planId}&amount=${amount}`;

    // 4. Dispatch Payload to Cashfree Service
    const orderResponse = await cashfree.createOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: sanitizedWorkspaceId || "cust_001",
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName,
      },
      order_meta: {
        return_url: resolvedReturnUrl,
        notify_url: `${appUrl}/api/v1/payments/cashfree/webhook`,
      },
      order_note: `Appnix Subscription: ${resolvedPlanName} (${billingCycle})`,
    });

    const isMock = !cashfree.isLiveConfigured();

    // 5. Store Created Order in Database & Persistent Store with PENDING status
    saveStoredOrder({
      id: `ord_${Date.now()}`,
      orderId,
      workspaceId,
      planId: plan?.slug || planId,
      planName: resolvedPlanName,
      amount,
      currency: "INR",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      await prisma.paymentOrder.create({
        data: {
          orderId,
          workspaceId,
          planId: plan ? plan.id : planId,
          amount,
          currency: "INR",
          paymentSessionId: orderResponse.payment_session_id,
          status: "PENDING",
        },
      });
    } catch (dbErr: any) {
      console.warn("[Cashfree Session API] Failed to record payment order in database:", dbErr.message);
    }

    // 6. Return standard Cashfree session payload to client
    return NextResponse.json({
      paymentSessionId: orderResponse.payment_session_id,
      orderId,
      amount,
      planId,
      paymentLink: orderResponse.payment_link || `/workspace/billing/checkout?plan=${planId}`,
      isMock,
    });
  } catch (error: any) {
    console.error("[Cashfree Session API] Exception:", error);

    if (error instanceof CashfreeAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create Cashfree payment session" },
      { status: 500 }
    );
  }
}
