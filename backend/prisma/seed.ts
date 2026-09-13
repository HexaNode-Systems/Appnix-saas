import { PrismaClient, Role, TenantTier, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Ensure environment variables are loaded (.env.local takes precedence for local development)
dotenv.config({ path: '.env.local', override: true });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);

async function main() {
  console.log('====================================================');
  console.log('🌱 APPNIX SAAS — DATABASE SEEDER (SUPERADMIN & ROOT)');
  console.log('====================================================\n');

  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@appnix.co.in').toLowerCase().trim();
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2026!';
  const superAdminName = process.env.SUPERADMIN_NAME || 'Platform Super Admin';

  console.log('1️⃣  Resolving Platform Root Workspace...');

  // 1. Find or create the PLATFORM_ROOT tenant
  let rootTenant = await prisma.tenant.findFirst({
    where: { tier: TenantTier.PLATFORM_ROOT },
  });

  if (!rootTenant) {
    // Also check by slug in case slug 'appnix-root' exists with another tier
    rootTenant = await prisma.tenant.findUnique({
      where: { slug: 'appnix-root' },
    });
  }

  if (!rootTenant) {
    rootTenant = await prisma.tenant.create({
      data: {
        name: 'Appnix Platform Root',
        slug: 'appnix-root',
        tier: TenantTier.PLATFORM_ROOT,
        status: TenantStatus.ACTIVE,
        path: 'root',
        depth: 0,
        primaryColor: '#0f172a',
        maxSubResellers: 999999,
        maxEndClients: 999999,
        maxUsers: 999999,
        twoFactorEnabled: false,
      },
    });
    console.log(`   ✅ Created Platform Root Tenant: ${rootTenant.name} (${rootTenant.id})`);
  } else {
    // Ensure tier is PLATFORM_ROOT and status is ACTIVE
    rootTenant = await prisma.tenant.update({
      where: { id: rootTenant.id },
      data: {
        tier: TenantTier.PLATFORM_ROOT,
        status: TenantStatus.ACTIVE,
        path: 'root',
        depth: 0,
      },
    });
    console.log(`   ℹ️  Existing Platform Root Tenant found: ${rootTenant.name} (${rootTenant.id})`);
  }

  // 2. Ensure Platform Root Tenant has a Wallet
  const rootWallet = await prisma.wallet.upsert({
    where: { tenantId: rootTenant.id },
    update: {},
    create: {
      tenantId: rootTenant.id,
      balance: 1000000.0,
      currency: 'INR',
      minThreshold: 500.0,
      autoRechargeEnabled: false,
      defaultPaymentMethod: 'Platform Master Account',
    },
  });
  console.log(`   ✅ Root Tenant Wallet ready: Balance ₹${rootWallet.balance.toLocaleString('en-IN')}`);

  console.log('\n2️⃣  Provisioning Super Administrator Account...');

  // 3. Hash Superadmin Password securely (12 rounds)
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(superAdminPassword, saltRounds);

  // 4. Upsert Superadmin user
  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      name: superAdminName,
      passwordHash,
      role: Role.SUPER_ADMIN,
      tenantId: rootTenant.id,
      twoFactorEnabled: false,
    },
    create: {
      email: superAdminEmail,
      name: superAdminName,
      passwordHash,
      role: Role.SUPER_ADMIN,
      tenantId: rootTenant.id,
      twoFactorEnabled: false,
      language: 'en',
      theme: 'system',
    },
  });

  console.log(`   ✅ Super Administrator provisioned successfully!`);

  console.log('\n3️⃣  Ensuring Standard Platform Subscription Plans...');

  // 5. Seed default plans (Starter, Professional, Enterprise)
  const defaultPlans = [
    {
      name: 'Starter Tier',
      slug: 'starter',
      description: 'Essential messaging and contact management for growing businesses.',
      price: 999,
      monthlyPrice: 999,
      yearlyPrice: 9990,
      currency: 'INR',
      billingCycle: 'monthly',
      monthlyMessages: 2000,
      botflows: 1,
      teamSeats: 2,
      maxUsers: 2,
      maxContacts: 500,
      maxCampaigns: 5,
      maxBots: 1,
      maxMessages: 2000,
      trialDays: 0,
      isPopular: false,
      status: 'ACTIVE',
      features: [
        'Up to 2,000 monthly messages',
        '2 WhatsApp / Social channels',
        '1 Automation Botflow',
        '2 Team Members',
        'Community Support',
      ],
    },
    {
      name: 'Professional Tier',
      slug: 'pro',
      description: 'For fast-scaling teams automating campaigns, custom botflows, and customer care.',
      price: 2999,
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      currency: 'INR',
      billingCycle: 'monthly',
      monthlyMessages: 25000,
      botflows: 5,
      teamSeats: 10,
      maxUsers: 10,
      maxContacts: 5000,
      maxCampaigns: 50,
      maxBots: 5,
      maxMessages: 25000,
      trialDays: 14,
      isPopular: true,
      status: 'ACTIVE',
      features: [
        'Up to 25,000 monthly messages',
        'Unlimited Channels (WhatsApp, IG, FB, RCS)',
        '5 Advanced AI Botflows',
        '10 Team Member Seats',
        'Priority Live Support & SLA',
        'Custom Webhooks & REST API',
      ],
    },
    {
      name: 'Enterprise Tier',
      slug: 'enterprise',
      description: 'Dedicated cloud infrastructure, custom LLM models, and white-glove onboarding.',
      price: 9999,
      monthlyPrice: 9999,
      yearlyPrice: 99990,
      currency: 'INR',
      billingCycle: 'monthly',
      monthlyMessages: 250000,
      botflows: 50,
      teamSeats: 50,
      maxUsers: 50,
      maxContacts: 50000,
      maxCampaigns: 500,
      maxBots: 50,
      maxMessages: 250000,
      trialDays: 30,
      isPopular: false,
      status: 'ACTIVE',
      features: [
        '250,000+ monthly messages',
        'Unlimited Botflows & Integrations',
        '50 Team Member Seats',
        '24/7 Dedicated Account Manager',
        'Custom Domain & Full White-labeling',
        'Enterprise SLA & HIPAA/GDPR Compliance',
      ],
    },
  ];

  try {
    for (const plan of defaultPlans) {
      const { features, ...planData } = plan;
      await prisma.plan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          monthlyMessages: plan.monthlyMessages,
          botflows: plan.botflows,
          teamSeats: plan.teamSeats,
          maxUsers: plan.maxUsers,
          maxContacts: plan.maxContacts,
          maxCampaigns: plan.maxCampaigns,
          maxBots: plan.maxBots,
          maxMessages: plan.maxMessages,
          features: features,
          status: 'ACTIVE',
        },
        create: {
          ...planData,
          features: features,
        },
      });
      console.log(`   ✅ Plan seeded: ${plan.name} (${plan.slug})`);
    }
  } catch {
    console.log('   ℹ️  Plans table not yet created in active migrations; skipping plan seeding.');
  }

  console.log('\n====================================================');
  console.log('🚀 SEEDING COMPLETED SUCCESSFULLY');
  console.log('====================================================');
  console.log(`📌 SuperAdmin Email:    ${superAdminUser.email}`);
  console.log(`🔑 SuperAdmin Password: ${superAdminPassword}`);
  console.log(`👑 User Role:           ${superAdminUser.role}`);
  console.log(`🏢 Workspace:           ${rootTenant.name} (${rootTenant.tier})`);
  console.log(`🌐 Workspace Path:      ${rootTenant.path}`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal error during database seeding:\n', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
