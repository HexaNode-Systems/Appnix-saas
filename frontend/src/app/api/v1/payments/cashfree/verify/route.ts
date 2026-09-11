import { NextRequest, NextResponse } from "next/server";
import { cashfree, CashfreePaymentEntity } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma";
import { getStoredOrders, saveStoredOrder } from "@/lib/transactions-store";
import { getAuthenticatedWorkspace } from "@/lib/server/authenticated-workspace";

export async function GET(req: NextRequest) {
  return handleVerify(req);
}

export async function POST(req: NextRequest) {
  return handleVerify(req);
}

async function handleVerify(req: NextRequest) {
  const session = await getAuthenticatedWorkspace(req);
  if (!session) {
    return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  let orderId = searchParams.get("order_id") || searchParams.get("orderId");
  let explicitPlan = searchParams.get("plan");
  let explicitAmount = searchParams.get("amount");
  let explicitStatus = searchParams.get("status");

  if (req.method === "POST") {
    try {
      const body = await req.json();
      orderId = orderId || body.order_id || body.orderId;
      explicitPlan = explicitPlan || body.plan || body.planId;
      explicitAmount = explicitAmount || body.amount;
      explicitStatus = explicitStatus || body.status;
    } catch {}
  }

  if (!orderId) {
    return NextResponse.json({ error: "Missing required order_id parameter" }, { status: 400 });
  }

  // 1. Locate Order from PostgreSQL and Persistent File Store
  let dbOrder: any = null;
  try {
    dbOrder = await prisma.paymentOrder.findFirst({
      where: { orderId },
    });
  } catch (err: any) {
    console.warn("[Cashfree Verify] Prisma lookup notice:", err.message);
  }

  const storedOrders = getStoredOrders();
  const fileOrder = storedOrders.find((o) => o.orderId === orderId);

  const effectiveWorkspaceId = dbOrder?.workspaceId || fileOrder?.workspaceId || session.workspaceId;
  const resolvedPlanId = fileOrder?.planId || dbOrder?.planId || explicitPlan || "pro";
  const resolvedAmount = Number(fileOrder?.amount || dbOrder?.amount || explicitAmount || 2999);
  const resolvedPlanName =
    fileOrder?.planName ||
    (resolvedPlanId === "enterprise"
      ? "Enterprise Custom"
      : resolvedPlanId === "pro"
      ? "Professional Tier"
      : "Starter Tier");

  try {
    let paid = false;
    let failed = false;
    let paymentId = "";
    let paymentMethod = "Cashfree PG";
    let failureReason: string | undefined;

    if (cashfree.isLiveConfigured()) {
      // Real Cashfree Gateway Verification
      const [cashfreeOrder, payments] = await Promise.all([
        cashfree.getOrder(orderId),
        cashfree.getOrderPayments(orderId),
      ]);

      const successfulPayment = (payments as CashfreePaymentEntity[]).find(
        (payment) => payment.payment_status === "SUCCESS"
      );

      paid = cashfreeOrder.order_status === "PAID" || Boolean(successfulPayment);
      failed =
        ["EXPIRED", "TERMINATED"].includes(cashfreeOrder.order_status) ||
        (payments as CashfreePaymentEntity[]).some((p) => p.payment_status === "FAILED");

      if (successfulPayment) {
        paymentId = String(successfulPayment.cf_payment_id);
        paymentMethod = successfulPayment.payment_group || "Cashfree PG";
      } else if (cashfreeOrder.cf_order_id) {
        paymentId = String(cashfreeOrder.cf_order_id);
      }

      if (failed) {
        failureReason = "Payment was expired, terminated, or rejected by Cashfree.";
      }
    } else {
      // Sandbox / Simulation Mode: Strictly require explicit success simulation
      const isExplicitSuccess =
        explicitStatus === "SUCCESS" ||
        fileOrder?.status === "SUCCESS" ||
        dbOrder?.status === "SUCCESS";

      const isExplicitFail =
        explicitStatus === "FAILED" ||
        explicitStatus === "cancelled" ||
        explicitStatus === "failed" ||
        fileOrder?.status === "FAILED" ||
        dbOrder?.status === "FAILED";

      if (isExplicitFail) {
        failed = true;
        paid = false;
        failureReason = "Payment was cancelled or declined in sandbox simulation.";
      } else if (isExplicitSuccess) {
        paid = true;
        failed = false;
        paymentId = fileOrder?.cfPaymentId || `cf_mock_${Date.now()}`;
        paymentMethod = fileOrder?.paymentMethod || "Cashfree Sandbox Verified";
      } else {
        // Pending: user has not completed or simulated the payment yet
        paid = false;
        failed = false;
      }
    }

    // If payment is NOT paid: return FAILED or PENDING without activating subscription
    if (!paid) {
      if (failed) {
        try {
          await prisma.paymentOrder.updateMany({
            where: { orderId },
            data: { status: "FAILED" },
          });
        } catch {}
        saveStoredOrder({
          id: fileOrder?.id || `ord_${Date.now()}`,
          orderId,
          workspaceId: effectiveWorkspaceId,
          planId: resolvedPlanId,
          planName: resolvedPlanName,
          amount: resolvedAmount,
          currency: "INR",
          status: "FAILED",
          createdAt: fileOrder?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        orderId,
        status: failed ? "FAILED" : "PENDING",
        planName: resolvedPlanName,
        planId: resolvedPlanId,
        amount: resolvedAmount,
        currency: "INR",
        failureReason: failed ? (failureReason || "Payment was not successful.") : undefined,
      });
    }

    // ================= PAYMENT IS VERIFIED SUCCESS =================
    // 1. Update order in PostgreSQL and persistent store
    try {
      await prisma.paymentOrder.updateMany({
        where: { orderId },
        data: { status: "SUCCESS", cfPaymentId: paymentId, paymentMethod },
      });
    } catch {}

    saveStoredOrder({
      id: fileOrder?.id || `ord_${Date.now()}`,
      orderId,
      workspaceId: effectiveWorkspaceId,
      planId: resolvedPlanId,
      planName: resolvedPlanName,
      amount: resolvedAmount,
      currency: "INR",
      status: "SUCCESS",
      cfPaymentId: paymentId,
      paymentMethod,
      createdAt: fileOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Server-side Subscription Activation via backend API
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://api.appnix.co.in/api/v1";

    let backendActivated = false;
    try {
      const activation = await fetch(`${backendUrl}/billing/activate-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session.authorization,
        },
        body: JSON.stringify({
          orderId,
          paymentId,
          planId: resolvedPlanId,
          amount: resolvedAmount,
          paymentMethod,
        }),
      });

      if (activation.ok) {
        backendActivated = true;
      } else {
        const errJson = await activation.json().catch(() => ({}));
        console.warn("[Cashfree Verify] Backend activation response:", errJson);
      }
    } catch (netErr: any) {
      console.warn("[Cashfree Verify] Backend activation network error:", netErr.message);
    }

    // 3. Fallback direct PostgreSQL activation if backend endpoint wasn't reachable
    if (!backendActivated && effectiveWorkspaceId) {
      try {
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(now.getDate() + 30);

        await prisma.$transaction(async (tx: any) => {
          // Cancel previous active/trialing subscriptions
          await tx.subscription.updateMany({
            where: { tenantId: effectiveWorkspaceId, status: { in: ["ACTIVE", "TRIALING"] } },
            data: { status: "CANCELLED" as any },
          });

          // Fetch plan limits
          const maxMsgs = resolvedPlanId === "enterprise" ? 250000 : resolvedPlanId === "pro" ? 25000 : 2000;
          const maxBots = resolvedPlanId === "enterprise" ? 50 : resolvedPlanId === "pro" ? 5 : 1;
          const maxSeats = resolvedPlanId === "enterprise" ? 50 : resolvedPlanId === "pro" ? 10 : 2;

          // Create active subscription
          await tx.subscription.create({
            data: {
              tenantId: effectiveWorkspaceId,
              planId: resolvedPlanId,
              planName: resolvedPlanName,
              price: `₹${resolvedAmount.toLocaleString("en-IN")}/mo`,
              status: "ACTIVE" as any,
              totalDays: 30,
              remainingDays: 30,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              maxMessages: maxMsgs,
              usedMessages: 0,
              maxBots,
              usedBots: 0,
              maxTeamSeats: maxSeats,
              usedTeamSeats: 1,
              stripeSubscriptionId: orderId,
              stripeCustomerId: paymentId || "CASHFREE",
            },
          });

          // Create tax invoice
          await tx.invoice.create({
            data: {
              tenantId: effectiveWorkspaceId,
              invoiceNumber: orderId,
              plan: `${resolvedPlanName} (MONTHLY)`,
              amount: `₹${resolvedAmount.toLocaleString("en-IN")}`,
              status: "Paid",
            },
          });
        });
      } catch (dbErr: any) {
        console.error("[Cashfree Verify] Direct DB activation error:", dbErr.message);
      }
    }

    return NextResponse.json({
      orderId,
      status: "SUCCESS",
      planName: resolvedPlanName,
      planId: resolvedPlanId,
      amount: resolvedAmount,
      currency: "INR",
      paymentMethod,
      cfPaymentId: paymentId,
      paidAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cashfree Verify API Error]:", error);
    return NextResponse.json({ error: "Unable to verify payment with Cashfree." }, { status: 502 });
  }
}
