# Appnix SaaS — Unified Omnichannel Business Messaging & Marketing Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-e0234e?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)

**Appnix** is an enterprise-grade, white-label, multi-tenant Software-as-a-Service (SaaS) platform designed for omnichannel marketing, customer relationship management (CRM), conversational AI bots, workflow automation, and real-time live chat across **WhatsApp Business Cloud API**, **Google RCS Business Messaging**, **Instagram Direct**, and **Facebook Messenger**.

---

## Table of Contents

1. [Executive Architecture Overview](#executive-architecture-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [End-to-End System Flows](#end-to-end-system-flows)
   - [1. User Authentication & Session Security](#1-user-authentication--session-security)
   - [2. Hierarchical Multi-Tenancy & White-Label Reselling](#2-hierarchical-multi-tenancy--white-label-reselling)
   - [3. WhatsApp Cloud API & Embedded Onboarding](#3-whatsapp-cloud-api--embedded-onboarding)
   - [4. RCS Business Messaging Lifecycle](#4-rcs-business-messaging-lifecycle)
   - [5. Broadcast Campaign Lifecycle (7-Step Wizard)](#5-broadcast-campaign-lifecycle-7-step-wizard)
   - [6. Real-Time Live Chat & 24h Customer Care Inbox](#6-real-time-live-chat--24h-customer-care-inbox)
   - [7. Visual Workflow Automation & No-Code Bot Builder](#7-visual-workflow-automation--no-code-bot-builder)
   - [8. CRM Contacts, SuperFields & Tagging Engine](#8-crm-contacts-superfields--tagging-engine)
   - [9. Subscription Billing, Cashfree Payments & Wallet Ledger](#9-subscription-billing-cashfree-payments--wallet-ledger)
   - [10. Super Admin & Platform Governance](#10-super-admin--platform-governance)
5. [Database Architecture & Core Schemas](#database-architecture--core-schemas)
6. [Frontend Application Directory & Routes](#frontend-application-directory--routes)
7. [Backend API Architecture & Endpoints](#backend-api-architecture--endpoints)
8. [Security, Encryption & Ingestion](#security-encryption--ingestion)
9. [Environment Configuration Reference](#environment-configuration-reference)
10. [Local Development Quickstart](#local-development-quickstart)
11. [Production Infrastructure & Deployment](#production-infrastructure--deployment)
12. [Contributing & Code Standards](#contributing--code-standards)

---

## Executive Architecture Overview

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Web[Web Browsers / Next.js 16 SPA]
        Mobile[Mobile Browsers]
        WebhookSenders[Meta / Cashfree Webhooks]
        ChatWidget[Embedded Web Chat Widgets]
    end

    subgraph Edge["Edge / CDN & Security"]
        CF[Cloudflare CDN / SSL / WAF]
        Nginx[Nginx Reverse Proxy & Let's Encrypt]
    end

    subgraph Frontend["Frontend (Next.js 16 + React 19)"]
        LandingPage["(marketing) /"]
        AuthApp["(auth) /signin /signup /otp"]
        DashboardApp["(dashboard) 40+ Business Routes"]
        AdminApp["(admin) /admin/* Management Console"]
        NextProxy["API Proxy: /api/proxy/[...path]"]
        NextMiddleware["proxy.ts: Auth Guard & Tenant Rewrite"]
    end

    subgraph Backend["Backend Core (NestJS 10 Engine)"]
        TenantContext[TenantContextMiddleware & AsyncLocalStorage]
        AuthGuard[JwtAccessGuard / HierarchyGuard / SuperAdminGuard]
        SubscriptionGuard[SubscriptionGuard & Quota Enforcer]
        Modules["30+ Modules: Auth, Campaigns, Chat, Workflows, CRM, Billing..."]
    end

    subgraph Storage["Data & Cloud Services"]
        RDS[(AWS RDS PostgreSQL 16)]
        R2[Cloudflare R2 Object Storage / S3]
        MetaAPI[Meta Graph API v21]
        CashfreeAPI[Cashfree Payment Gateway API]
        BrevoSMTP[Brevo Transactional Email Service]
    end

    Web --> CF --> Nginx
    Mobile --> CF --> Nginx
    ChatWidget --> CF --> Nginx
    WebhookSenders --> CF --> Nginx

    Nginx --> NextMiddleware --> Frontend
    Nginx --> Backend

    NextProxy --> Backend
    Backend --> RDS
    Backend --> R2
    Backend --> MetaAPI
    Backend --> CashfreeAPI
    Backend --> BrevoSMTP
```

---

## Monorepo Structure

```
appnix-saas/
├── backend/                       # NestJS 10 Enterprise Backend API
│   ├── prisma/                    # Prisma 5 schema, migrations, and seeds
│   │   └── schema.prisma          # Comprehensive multi-tenant schema
│   ├── src/
│   │   ├── common/                # Shared decorators, filters, guards, middleware, utils
│   │   │   ├── guards/            # HierarchyGuard, SubscriptionGuard, TenantGuard
│   │   │   ├── middleware/        # TenantContextMiddleware (host, subdomain, header resolution)
│   │   │   └── interceptors/      # SupportAuditInterceptor (impersonation logging)
│   │   ├── lib/                   # AsyncLocalStorage TenantContextStore, crypto utilities
│   │   ├── modules/               # 30 domain modules (Auth, Campaigns, Chat, Billing, etc.)
│   │   ├── app.module.ts          # Root module registering all sub-modules
│   │   └── main.ts                # Bootstrap: CORS, Swagger, ValidationPipe, Global Prefix
│   ├── DEPLOYMENT.md              # AWS EC2 + RDS + PM2 infrastructure deployment guide
│   ├── Dockerfile                 # Production backend container build
│   ├── ecosystem.config.js        # PM2 cluster configuration
│   └── package.json
│
├── frontend/                      # Next.js 16 App Router Modern Frontend
│   ├── public/                    # Favicons, marketing illustrations, brand assets
│   ├── src/
│   │   ├── app/                   # Next.js App Router route tree
│   │   │   ├── (admin)/           # Super Admin & Reseller Management console (/admin/*)
│   │   │   ├── (auth)/            # Authentication flows (/signin, /signup, /verify-otp, etc.)
│   │   │   ├── (dashboard)/       # Authenticated business operations (40+ routes)
│   │   │   ├── (marketing)/       # High-converting landing page, legal, privacy policies
│   │   │   ├── api/               # Next.js serverless proxy and webhook handlers
│   │   │   └── globals.css        # Tailwind CSS v4 design tokens and CSS variables
│   │   ├── components/            # UI library, layout components, campaign steps, modals
│   │   ├── hooks/                 # Custom React hooks (Zustand stores, theme, toast)
│   │   ├── lib/                   # Axios client with interceptors, AuthContext, TanStack Query
│   │   ├── proxy.ts               # Navigation route guards and role gatekeeping
│   │   └── types/                 # TypeScript type declarations
│   ├── components.json            # shadcn/ui configuration (base-nova)
│   └── package.json
│
├── scripts/                       # Testing & automation utilities
│   ├── cashfree-mcp-server.mjs    # Cashfree payment MCP integration server
│   ├── test-cashfree-backend-lifecycle.mjs
│   └── test-cashfree-sandbox.mjs
└── README.md                      # Authoritative Root Documentation
```

---

## Technology Stack

### Frontend Application
- **Framework**: Next.js 16.3.0 (App Router, Turbopack, React Server Components)
- **Runtime & UI**: React 19.2.8 with TypeScript 5 (Strict Mode)
- **Design System**: Tailwind CSS v4, CSS Variables, Radix UI Primitives, Lucide React
- **Component Primitives**: shadcn/ui (`base-nova` preset)
- **State Management**:
  - **Server Cache**: TanStack React Query v5.101.4
  - **Client UI State**: Zustand 5.0.14
  - **Form Validation**: React Hook Form 7.85.0 + Zod 3.25.76
- **HTTP Client**: Axios with automatic JWT 401 refresh interceptors and cookie reflection
- **Visualization**: Recharts 3.10.1 (analytics charts, bar charts, conversion funnels)

### Backend Engine
- **Framework**: NestJS 10.4.0 (TypeScript Modular Architecture)
- **Database ORM**: Prisma ORM 5.22.0
- **Database Engine**: AWS RDS PostgreSQL 16
- **Object Storage**: Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`)
- **Authentication**: Passport.js, `@nestjs/jwt`, `passport-jwt`, `passport-google-oauth20`, `bcryptjs`
- **Security & Cryptography**: Native Node.js `crypto` with `AES-256-GCM` encryption for credentials at rest
- **Payment Processing**: Cashfree Payments SDK (`@cashfreepayments/cashfree-js`)
- **Email Delivery**: Brevo (formerly Sendinblue) Transactional API / SMTP
- **API Documentation**: OpenAPI / Swagger 7.4.0 (`/api/docs`)

---

## End-to-End System Flows

### 1. User Authentication & Session Security

The authentication architecture combines short-lived JSON Web Tokens (JWT) for high-security API operations with HttpOnly SameSite cookies and auto-refresh mechanisms.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant FE as Next.js Frontend
    participant Proxy as Next.js API Proxy
    participant BE as NestJS Auth Module
    participant DB as PostgreSQL (Prisma)

    User->>FE: Submits Email & Password (+ optional Remember Me)
    FE->>Proxy: POST /api/proxy/auth/login
    Proxy->>BE: Forward to /api/v1/auth/login
    BE->>DB: Lookup User & Tenant status
    DB-->>BE: User record + passwordHash + Tenant path
    BE->>BE: Verify bcrypt password hash
    BE->>BE: Generate Access Token (15m) & Refresh Token (7d / 30d)
    BE->>DB: Store hashed refreshToken
    BE-->>Proxy: Return AuthResponse + Set-Cookie (HttpOnly, Secure, SameSite=Lax)
    Proxy-->>FE: AuthResponse + mirror cookie for SSR
    FE->>FE: AuthContext sets authenticated user state
    FE->>User: Redirect to /dashboard
```

- **Google OAuth 2.0 Flow**: Users can sign in via Google One-Tap or OAuth redirect. The backend exchanges the Google profile or ID token, provisions the tenant workspace if new, links `googleId`, and issues session tokens.
- **Token Refresh Cycle**: When the 15-minute access token expires, the Axios response interceptor intercepts `401 Unauthorized`, automatically invokes `POST /api/v1/auth/refresh` using the secure refresh cookie, renews credentials, and seamlessly retries the original request without user interruption.
- **Two-Factor Authentication (2FA)**: Account settings allow toggling 2FA for enhanced login protection.

---

### 2. Hierarchical Multi-Tenancy & White-Label Reselling

Appnix incorporates a **Materialized Path Tree** architecture (`path`, `depth`, `parentId`) enabling deep multi-tier reselling:

```mermaid
graph TD
    Root["PLATFORM_ROOT (path: 'root')<br/>Appnix Super Admin"]
    Reseller1["PRIMARY_RESELLER (path: 'root.reseller1')<br/>White-Label Agency A"]
    Reseller2["PRIMARY_RESELLER (path: 'root.reseller2')<br/>Enterprise Partner B"]
    SubReseller["SUB_RESELLER (path: 'root.reseller1.sub1')<br/>Regional Sub-Agency"]
    Client1["END_CLIENT (path: 'root.reseller1.client1')<br/>Retail Business"]
    Client2["END_CLIENT (path: 'root.reseller1.sub1.client2')<br/>E-Commerce Store"]

    Root --> Reseller1
    Root --> Reseller2
    Reseller1 --> SubReseller
    Reseller1 --> Client1
    SubReseller --> Client2
```

1. **Host & Subdomain Resolution**: Incoming requests pass through `TenantContextMiddleware`. The middleware checks custom domains, domain mappings, or subdomain slugs against an in-memory LRU cache before querying PostgreSQL.
2. **Access Isolation**: Every database query in business modules injects the resolved `tenantId`.
3. **Descendant Hierarchy Validation**: `HierarchyGuard` enforces that `RESELLER_ADMIN` accounts can only query or configure tenant workspaces whose materialized path begins with `caller.orgPath + '.'`.
4. **Super Admin Impersonation Support Mode**: Authorized `SUPER_ADMIN` operators can issue short-lived support tokens via `POST /super-admin/impersonation`. The client sends `X-Impersonation-Token`, and every inspected read and action is audited in the append-only `AuditLog` table.

---

### 3. WhatsApp Cloud API & Embedded Onboarding

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Workspace Owner
    participant FE as Channels UI (/channels/whatsapp)
    participant MetaSDK as Meta Facebook JavaScript SDK
    participant BE as Channels Module
    participant MetaAPI as Meta Graph API v21

    Admin->>FE: Clicks "Connect WhatsApp Business"
    FE->>BE: GET /api/v1/channels/whatsapp/config-public
    BE-->>FE: Return appId & embeddedSignupConfigId
    FE->>MetaSDK: Launch FB.login with whatsapp_business_messaging scope
    Admin->>MetaSDK: Authorizes WABA, phone numbers, and payment method
    MetaSDK-->>FE: Returns auth response with code & waba_id
    FE->>BE: POST /api/v1/channels/whatsapp/embedded-signup
    BE->>MetaAPI: Exchange code for Permanent System User Token
    BE->>MetaAPI: Register phone number & subscribe webhooks
    BE->>BE: Encrypt Meta Access Token (AES-256-GCM)
    BE->>BE: Store ChannelConfig record in PostgreSQL
    BE-->>FE: Connection success & verified WABA info
```

- **Template Synchronization**: Official WhatsApp message templates (Marketing, Utility, Authentication) sync bi-directionally with Meta Graph API.
- **Inbound Webhook Ingestion**: Inbound customer messages and delivery status receipts (`sent`, `delivered`, `read`, `failed`) are processed idempotently with `x-hub-signature-256` HMAC-SHA256 verification.

---

### 4. RCS Business Messaging Lifecycle

1. **Agent Registration**: Configure brand verification, brand logos, brand color, and commercial carrier agreements.
2. **RCS Template Creation**: Supports Text messages, Rich Cards (media + title + subtitle + suggestion chips), and Rich Card Carousels (up to 10 cards).
3. **Carrier Approval Pipeline**: Submits templates to Google/carrier endpoints; statuses track `DRAFT -> PENDING -> APPROVED / REJECTED`.
4. **Suggested Actions**: Interactive chips for Open URL, Dial Phone Number, View Location, and Predefined Postback Replies.

---

### 5. Broadcast Campaign Lifecycle (7-Step Wizard)

```mermaid
stateDiagram-v2
    [*] --> Step1_Details: Enter Name, Tags & Goals
    Step1_Details --> Step2_Audience: Select Contact Segments
    Step2_Audience --> Step3_Channel: Choose WhatsApp, RCS, IG, or FB
    Step3_Channel --> Step4_Template: Pick Approved Template
    Step4_Template --> Step5_Variables: Map Dynamic {{variables}} to Contact Fields
    Step5_Variables --> Step6_Preview: Live Message Preview & Test Send
    Step6_Preview --> Step7_Review: Validation Check & Wallet Balance Check
    Step7_Review --> SCHEDULED: Pick Future Date & Time
    Step7_Review --> LAUNCHING: Click "Launch Campaign Now"
    SCHEDULED --> LAUNCHING: Background Cron Trigger
    LAUNCHING --> RUNNING: Batch Dispatch to Meta/RCS
    RUNNING --> COMPLETED: All Messages Processed
    RUNNING --> FAILED: Critical Provider Error
```

- **Variable Fallbacks**: Automatic fallback replacement prevents delivery failures when a contact's custom field is empty.
- **Pre-Flight Validation**: Checks available wallet balance, channel connection health, and approved template status before dispatch.
- **Per-Message Debit & Auto-Refund**: Deducts cost per message from the tenant wallet. If Meta returns a delivery failure (e.g., undeliverable number), the system marks the transaction as failed and executes an instant automated refund to the tenant's wallet.

---

### 6. Real-Time Live Chat & 24h Customer Care Inbox

- **Multi-Channel Inbox**: Unified view aggregating WhatsApp, Instagram, Facebook Messenger, and RCS conversations.
- **Meta 24-Hour Service Window Tracker**: Accurately counts down remaining hours in the customer care window. Free-form messaging is allowed while the window is active; once expired, the UI restricts outbound messaging to approved WhatsApp templates.
- **Human Agent Handover**: Toggles automated bot flow vs. human agent assignment.
- **Internal Collaboration**: Team members can attach internal private notes, assign conversations to departments, adjust sentiment tags, and edit contact SuperFields directly from the live chat sidebar.

---

### 7. Visual Workflow Automation & No-Code Bot Builder

```mermaid
flowchart LR
    Trigger[Trigger:<br/>Inbound Message / Webhook / Form] --> Condition{Condition Node:<br/>Matches Intent or Tag?}
    Condition -- Yes --> Action1[Action Node:<br/>Query DataStore or CRM]
    Condition -- No --> Action2[Action Node:<br/>Send Fallback Template]
    Action1 --> AppStep[Integration Node:<br/>Call Shopify / Webhook API]
    AppStep --> Reply[Message Node:<br/>Send WhatsApp Rich Card]
```

- **Trigger Engine**: Supports `INBOUND_MESSAGE`, `WEBHOOK_EVENT`, `SCHEDULED_CRON`, and `FORM_SUBMISSION`.
- **Key-Value DataStore**: Workflows can read, update, and persist contextual JSON records keyed by phone number or user ID with configurable Time-To-Live (TTL).
- **App Credentials Vault**: Credentials for Shopify, OpenAI, Cashfree, HubSpot, and Webhooks are securely encrypted at rest using AES-256-GCM.

---

### 8. CRM Contacts, SuperFields & Tagging Engine

- **Contact Management**: Stores unified profiles across phone numbers, emails, assigned departments, and channel identifiers.
- **SuperFields Engine**: Custom dynamic attributes with strictly typed definitions:
  - `TEXT`, `TEXTAREA`, `DROPDOWN`, `MULTI_SELECT`, `NUMERIC`, `DECIMAL`, `AMOUNT`, `EMAIL`, `PHONE`, `URL`, `ADDRESS`, `DATE`, `DATETIME`, `PERIODIC_TIME`.
  - Configurable UI placement: Contact Profile, Chat Inbox Header, or Chat Sidebar.
- **Audience Segmentation**: Dynamic rule-based filtering (e.g., "Tag = Hot Lead AND Tier = Enterprise") for targeted broadcasting.
- **Bulk CSV Ingestion**: High-performance CSV parser with pre-import validation, duplicate detection (skip, overwrite, or reject), and batch tracking.

---

### 9. Subscription Billing, Cashfree Payments & Wallet Ledger

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant Admin
    participant FE as Frontend (/workspace/billing)
    participant BE as Billing & Cashfree Module
    participant CF as Cashfree Gateway

    Tenant->>FE: Selects Plan (Starter / Pro / Enterprise)
    FE->>BE: POST /api/v1/billing/checkout
    BE->>CF: Create Order (amount, customer details, return_url)
    CF-->>BE: Returns payment_session_id & order_id
    BE-->>FE: Return session payload
    FE->>FE: Mount Cashfree Drop SDK in modal
    Tenant->>FE: Completes payment (UPI / Card / NetBanking)
    CF->>BE: Webhook POST /api/v1/webhooks/cashfree (Signature Verified)
    BE->>BE: Update PaymentOrder status to SUCCESS
    BE->>BE: Upgrade Subscription tier and message quotas
    BE->>BE: Generate Invoice record
    BE-->>FE: Webhook ack -> Frontend confirms activation
```

- **Double-Entry Wallet Ledger**:
  - `Wallet`: Current balance in INR with configurable low-balance thresholds and auto-recharge flags.
  - `ChannelTransaction`: Detailed line-item logging per sent message (Base Rate + Platform Fee + Taxes) with delivery tracking and auto-refund capability.
  - `WalletTransaction`: Complete history of top-ups, subscriptions, and balance adjustments.

---

### 10. Super Admin & Platform Governance

- **Route Group**: `(admin)/admin/*` protected by `SUPER_ADMIN` and `RESELLER_ADMIN` role checks.
- **Platform Telemetry**: Global message throughput, active tenants, MRR/ARR revenue metrics, and system health status.
- **Client Provisioning**: Instant tenant creation, plan assignments, tier overrides, custom domain SSL verification, and tenant suspension.
- **Feature Flag System**: Granular feature flag toggling globally or per tenant (e.g., enable Voice AI, enable RCS, enable WhatsApp Mini Apps).
- **Comprehensive Audit Trail**: Records all administrative and impersonation activities with timestamps, actor IDs, target tenant IDs, and endpoint details.

---

## Database Architecture & Core Schemas

The application is backed by PostgreSQL via Prisma ORM with 20+ robust relational models:

| Model | Table Name | Purpose |
|-------|------------|---------|
| `Tenant` | `tenants` | Multi-tenant organization with materialized path hierarchy, limits, and custom branding |
| `DomainMapping` | `domain_mappings` | Custom white-label domain hostnames, verification, and SSL provision status |
| `AuditLog` | `audit_logs` | Append-only platform administration and support impersonation audit trail |
| `User` | `users` | User credentials, roles (`SUPER_ADMIN`, `RESELLER_ADMIN`, `TENANT_ADMIN`, `MEMBER`), preferences |
| `Subscription` | `subscriptions` | Active workspace subscription plan, message quotas, bot limits, and seat counts |
| `Plan` | `plans` | Available platform pricing tiers, billing cycles, quotas, and feature entitlements |
| `PaymentOrder` | `payment_orders` | Cashfree payment gateway orders, transaction sessions, and raw webhook records |
| `Invoice` | `invoices` | Tax invoices, payment amounts, and download receipts |
| `Wallet` | `wallets` | Prepaid message credit balance, auto-recharge settings, and default payment methods |
| `WalletTransaction` | `wallet_transactions` | Ledger of top-ups, subscription debits, and balance refunds |
| `ChannelTransaction` | `channel_transactions` | Itemized per-message billing ledger with carrier audit and auto-refund tracking |
| `CrmContact` | `crm_contacts` | Contact directory with phone, email, tags, and dynamic SuperField values |
| `SuperField` | `super_fields` | Dynamic custom attribute schema definitions, validation rules, and placement settings |
| `ContactTag` | `contact_tags` | Categorization tags with color tones and iconography |
| `Conversation` | `conversations` | Multi-channel chat threads, 24h care window status, bot state, and agent assignment |
| `Message` | `messages` | Sent and received messages, media URLs, delivery receipts, and provider message IDs |
| `Campaign` | `campaigns` | Multi-channel broadcast campaigns with state machine, scheduled times, and variable mappings |
| `CampaignAudience` | `campaign_audiences` | Targeted contact segments and snapshot definitions |
| `ChannelConfig` | `channel_configs` | Channel credentials (WhatsApp WABA, Instagram, Facebook, RCS) and connection state |
| `MetaTemplate` | `meta_templates` | Synced WhatsApp Cloud API message templates and localized component schemas |
| `RcsTemplate` | `rcs_templates` | RCS Rich Cards, carousels, standalone suggestion actions, and carrier approvals |
| `Folder` | `folders` | Workspace folders for organizing automation workflows and chatbots |
| `Workflow` | `workflows` | Visual canvas node and edge JSON graphs for automated customer journeys |
| `DataStore` | `data_stores` | Key-value JSON document stores for workflows with TTL expiration |
| `DataStoreRecord` | `data_store_records` | Individual key-value records belonging to a DataStore |
| `AppCredential` | `app_credentials` | AES-256-GCM encrypted 3rd-party integration credentials (Shopify, OpenAI, etc.) |
| `Bot` | `bots` | Interactive chatbot flow definitions and versioning |
| `WebhookEvent` | `webhook_events` | Idempotent event store for inbound provider webhooks |
| `Media` | `media` | Cloudflare R2 / S3 stored media assets, categories, and presigned upload metadata |
| `SupportTicket` | `support_tickets` | Customer support ticket threads, priorities, categories, and agent replies |

---

## Frontend Application Directory & Routes

The Next.js 16 frontend leverages route groups for clean boundary separation:

### 1. Marketing & Public Routes (`(marketing)`)
- `/` — High-converting landing page with 20 responsive sections, channel demos, ROI calculator, and lead capture modal
- `/privacy-policy` — Platform privacy policy
- `/terms-and-conditions` — Terms of service
- `/data-deletion` — Meta-compliant user data deletion instructions

### 2. Authentication Routes (`(auth)`)
- `/signin` & `/login` — Email/password + Google OAuth login with remember me
- `/signup` — Workspace registration and initial administrator provisioning
- `/forgot-password` — Password reset request via email OTP
- `/verify-otp` — 6-digit email verification
- `/reset-password` — Password update confirmation

### 3. Business Operations Dashboard (`(dashboard)`)
- `/dashboard` — KPI overview, message volume, recent activity feed, quick action shortcuts
- `/crm` — CRM pipeline, summary cards, and contact analytics
- `/crm/contacts` — Contact directory, CSV bulk import, export, and segment builder
- `/crm/live-chat` — Omnichannel chat inbox, 24h care window, internal notes, customer remarks
- `/crm/campaigns` — Campaign directory, status filters, duplicate, and delete actions
- `/crm/campaigns/create` & `/campaigns/new` — 7-step guided broadcast campaign wizard
- `/crm/bulk-campaign` — Quick broadcast creation and batch monitoring
- `/crm/super-fields` — Custom dynamic fields builder
- `/automations` — Visual workflow overview and list
- `/automations/workflow` — Drag-and-drop node/edge workflow canvas builder
- `/automations/templates` — Pre-built automation template catalog
- `/automations/data-store` & `/automations/datastore` — Key-value data storage
- `/automations/app-authentications` — 3rd-party OAuth & API credential connections
- `/automations/analytics` — Workflow execution telemetry and logs
- `/channels` — Channel overview & connectivity cards
- `/channels/whatsapp` — WhatsApp Cloud API Embedded Signup, WABA management, template sync
- `/channels/rcs` — RCS Agent registration and template builder
- `/channels/instagram` — Instagram Professional account connection
- `/channels/facebook` — Facebook Page connection
- `/channels/balance` & `/channels/statistics` — Channel usage and transaction ledger
- `/chat-widget` — Embeddable JavaScript website chat widget configurator & live preview
- `/chatbots` — Conversational AI bot flow designer
- `/products` — Product catalog management
- `/department` — Team department hierarchy and role permissions
- `/workspace` — General workspace settings
- `/workspace/billing` — Subscription plans, Cashfree checkout, and invoice receipts
- `/workspace/wallet` — Message credits wallet, top-up modal, and auto-recharge rules
- `/workspace/account-settings` — Workspace profile, API key regeneration, webhook URLs
- `/workspace/support` — Support ticket management
- `/settings` — Profile, security (2FA), notification preferences, activity audit trail

### 4. Admin & Reseller Console (`(admin)/admin/*`)
- `/admin/login` — Dedicated administrative sign-in portal
- `/admin/dashboard` — Platform-wide metrics, active tenants, revenue, and system throughput
- `/admin/clients` — Tenant onboarding, plan assignment, suspension, and domain inspection
- `/admin/team` — Staff directory and administrative role assignment
- `/admin/billing` — Platform revenue analytics, Cashfree transaction logs, and payout audits
- `/admin/feature-flags` — Dynamic feature flag toggles per tenant or globally
- `/admin/system-health` — API latency, database connection status, and infrastructure metrics
- `/admin/support` — Universal support ticket resolution desk
- `/admin/settings` — Global platform defaults, rate limits, and maintenance mode
- `/admin/audit-logs` — Immutable platform audit trail

---

## Backend API Architecture & Endpoints

All backend endpoints are prefixed with `/api/v1` and documented via OpenAPI / Swagger at `/api/docs`.

```
/api/v1/
├── auth/                         # Authentication & Session Management
│   ├── POST /signup              # Register tenant & administrator
│   ├── POST /login               # Authenticate & issue JWT HttpOnly cookies
│   ├── POST /admin/login         # Administrative portal sign-in
│   ├── POST /refresh             # Rotate access token using refresh token
│   ├── GET  /me                  # Current authenticated session profile
│   ├── POST /logout              # Revoke refresh token & clear cookies
│   ├── POST /forgot-password     # Dispatch OTP for password reset
│   ├── POST /verify-otp          # Verify 6-digit OTP
│   ├── POST /reset-password      # Complete password reset
│   ├── GET  /google              # Initiate Google OAuth redirect
│   ├── GET  /google/callback     # Google OAuth callback handler
│   └── POST /google              # Google One-Tap / ID token verification
│
├── tenants/                      # Hierarchical Multi-Tenancy
│   ├── GET  /resolve-domain      # Resolve incoming domain/subdomain to tenant branding
│   ├── GET  /                    # List tenants within caller hierarchy
│   ├── GET  /hierarchy           # Full organization tree for resellers / super admin
│   ├── GET  /:id                 # Get tenant details (hierarchy checked)
│   ├── POST /                    # Create new tenant or sub-reseller
│   └── PATCH /:id/branding       # Update white-label logos, colors, custom domain
│
├── campaigns/                    # Broadcast Campaigns Engine
│   ├── POST /                    # Create campaign draft
│   ├── GET  /                    # Paginated campaigns list with filters
│   ├── GET  /audiences           # Available contact audience segments
│   ├── GET  /channels            # Connected channels for broadcast
│   ├── GET  /templates           # Approved broadcast message templates
│   ├── POST /templates/refresh   # Pull fresh templates from Meta Graph API
│   ├── GET  /stats               # Aggregated campaign metrics & analytics
│   ├── GET  /:id                 # Get campaign details
│   ├── PUT  /:id                 # Update campaign draft
│   ├── PUT  /:id/audience        # Assign audience to campaign
│   ├── PUT  /:id/channel         # Assign channel to campaign
│   ├── PUT  /:id/template        # Assign template to campaign
│   ├── PUT  /:id/configure-template # Map variables to contact attributes
│   ├── POST /:id/test            # Dispatch single live test message
│   ├── POST /:id/validate        # Run pre-flight checks (balance, quotas, templates)
│   ├── POST /:id/launch          # Execute campaign launch immediately
│   ├── POST /:id/schedule        # Schedule campaign for future timestamp
│   └── DELETE /:id               # Delete campaign draft
│
├── chat/                         # Live Chat & 24h Customer Care Inbox
│   ├── GET  /conversations       # Filtered conversation list
│   ├── GET  /conversations/:id   # Conversation thread & message history
│   ├── POST /conversations/:id/messages # Send live outbound message
│   ├── POST /conversations/:id/notes    # Append internal team note
│   ├── POST /conversations/:id/remarks  # Update lead stage & sentiment
│   ├── POST /conversations/:id/tags     # Update conversation tags
│   └── POST /bulk-action         # Bulk mark read, assign, or close
│
├── channels/                     # Omnichannel Connectors
│   ├── GET  /                    # All channels connection status
│   ├── GET  /whatsapp/config-public # Public Meta App credentials for SDK popup
│   ├── GET  /whatsapp/status     # Verified WABA details & health
│   ├── POST /whatsapp/embedded-signup # Complete Meta onboarding callback
│   ├── POST /whatsapp/sync       # Refresh live limits from Meta Graph API
│   ├── POST /connect             # Connect Instagram, Facebook, RCS
│   ├── POST /disconnect/:channel # Disconnect a channel
│   ├── GET  /balance             # Channel balance metrics
│   ├── GET  /transactions        # Channel debit/credit ledger
│   └── GET  /statistics          # Delivery statistics breakdown
│
├── channels/whatsapp/templates/  # WhatsApp Template Management
│   ├── GET  /                    # List templates with pagination & filters
│   ├── GET  /:id                 # Get template components & preview
│   ├── POST /                    # Create template & submit to Meta
│   ├── PUT  /:id                 # Update template
│   ├── POST /:id/submit          # Submit draft template for Meta approval
│   ├── POST /:id/duplicate       # Clone an existing template
│   ├── DELETE /:id               # Delete template
│   ├── POST /:id/simulate-review # Sandbox simulation for approval/rejection
│   ├── GET  /flows/quota         # WhatsApp interactive flow quota
│   └── POST /flows/unlock        # Redeem key to increase flow limits
│
├── channels/rcs/templates/       # RCS Business Messaging Templates
│   ├── GET  /                    # List RCS templates
│   ├── GET  /:id                 # Single RCS template details
│   ├── POST /                    # Create Rich Card / Carousel template
│   ├── PUT  /:id                 # Update RCS template
│   ├── POST /:id/submit          # Submit template for carrier approval
│   └── DELETE /:id               # Delete RCS template
│
├── contacts/                     # CRM Contacts Directory
│   ├── GET  /                    # List all contacts for tenant
│   ├── POST /                    # Create new contact
│   ├── GET  /:id                 # Single contact profile & SuperFields
│   ├── PATCH /:id                # Update contact details
│   ├── DELETE /:id               # Delete contact
│   ├── POST /validate-csv        # Pre-import CSV validation & column mapping
│   ├── POST /bulk-import         # Bulk CSV contact import with duplicate rules
│   ├── GET  /import-history      # Past import batches & error logs
│   ├── POST /bulk-delete         # Delete multiple contacts by ID
│   ├── GET  /export              # Export contacts as structured data
│   ├── GET  /segments            # Audience segments list
│   ├── POST /segments            # Create rule-based segment
│   └── DELETE /segments/:id      # Delete segment
│
├── super-fields/                 # Dynamic Custom Field Definitions
│   ├── GET  /                    # List all tenant SuperFields
│   ├── GET  /metrics             # SuperFields usage statistics
│   ├── GET  /:id                 # Get single field definition
│   ├── POST /                    # Create custom SuperField
│   ├── PUT  /:id                 # Update validation or placement
│   ├── POST /:id/duplicate       # Duplicate field definition
│   ├── PATCH /:id/archive        # Archive field
│   └── DELETE /:id               # Delete field definition
│
├── automations/workflows/        # Workflow Automation Engine
│   ├── GET  /                    # List workflows with search & folder filters
│   ├── POST /                    # Create new visual workflow
│   ├── GET  /quota               # Workflow quota allowance
│   ├── GET  /folders             # Workflow folders list
│   ├── POST /folders             # Create workflow folder
│   ├── DELETE /folders/:id       # Delete workflow folder
│   ├── GET  /analytics           # Workflow execution logs & telemetry
│   ├── GET  /templates           # Pre-built automation template library
│   ├── POST /templates/:id/clone # Clone template into workspace
│   ├── GET  /:id                 # Get workflow nodes & edges
│   ├── PUT  /:id                 # Save workflow canvas state
│   ├── POST /:id/toggle          # Toggle active/paused state
│   ├── POST /:id/execute         # Trigger test workflow execution
│   ├── GET  /:id/history         # Execution modification history
│   └── DELETE /:id               # Delete workflow
│
├── automations/data-stores/      # Workflow Key-Value Storage
│   ├── GET  /                    # List data stores
│   ├── POST /                    # Create data store
│   ├── GET  /summary             # Data store usage summary
│   ├── GET  /:id                 # Get data store metadata
│   ├── DELETE /:id               # Delete data store
│   ├── GET  /:id/records         # Query records within store
│   ├── POST /:id/records         # Upsert key-value JSON record (with TTL)
│   ├── DELETE /:id/records/:key  # Delete record
│   └── POST /:id/clear           # Clear all records in store
│
├── automations/app-credentials/  # 3rd-Party App Integrations Vault
│   ├── GET  /catalog             # Catalog of supported apps (Shopify, OpenAI, etc.)
│   ├── GET  /summary             # Connected credentials overview
│   ├── GET  /                    # List saved credentials
│   ├── POST /                    # Store AES-256 encrypted credentials
│   ├── POST /validate-live       # Test connection with 3rd-party servers
│   ├── GET  /:id                 # Get credential metadata
│   ├── PATCH /:id                # Update credential
│   ├── DELETE /:id               # Delete credential
│   └── POST /:id/test            # Run health check against saved integration
│
├── billing/                      # Subscriptions & Payments
│   ├── GET  /plans               # Available subscription tiers
│   ├── GET  /subscription        # Current workspace subscription & quotas
│   ├── GET  /invoices            # Tax invoice history
│   ├── POST /checkout            # Initiate Cashfree payment order
│   ├── POST /activate-payment    # Verify payment & upgrade subscription
│   ├── POST /trial               # Activate eligible free trial
│   ├── POST /cancel              # Cancel subscription
│   └── POST /admin/assign        # Super Admin manual plan override
│
├── workspace/                    # Workspace Management & Wallet
│   ├── GET  /account-settings    # Personal settings, API keys, webhook URLs
│   ├── PUT  /account-settings    # Update workspace settings
│   ├── POST /api-keys/regenerate # Regenerate production API secret
│   ├── GET  /wallet              # Wallet balance & transaction history
│   ├── POST /wallet/topup        # Top-up message credit wallet
│   └── PUT  /wallet/auto-recharge # Configure auto-recharge rules
│
├── media/                        # Object Storage (Cloudflare R2 / S3)
│   ├── POST /presigned-upload    # Request secure presigned PUT upload URL
│   ├── POST /:id/confirm         # Confirm upload & activate media record
│   ├── GET  /                    # List uploaded media files
│   ├── GET  /:id                 # Get media metadata
│   ├── GET  /:id/download-url    # Generate signed GET download URL
│   └── DELETE /:id               # Delete media from R2 & database
│
├── webhooks/                     # Inbound Provider Webhooks
│   ├── GET  /meta                # Meta Webhook Challenge verification
│   ├── POST /meta                # Meta Inbound messages & delivery receipts
│   └── POST /cashfree            # Cashfree payment webhooks
│
├── super-admin/                  # Super Admin Operations
│   └── POST /impersonation       # Issue short-lived support token for workspace
│
└── health                        # Platform Health Check
    └── GET  /                    # Database, R2, and memory status
```

---

## Security, Encryption & Ingestion

### 1. Credentials Encryption at Rest
All 3rd-party integration tokens, Shopify API secrets, OpenAI keys, and Meta System User tokens are encrypted using **AES-256-GCM** via the `APP_ENCRYPTION_KEY` environment secret. Decryption occurs exclusively in-memory when making authorized outbound API calls.

### 2. Guard Pipeline
Requests are evaluated through an ordered guard pipeline:
1. `JwtAccessGuard`: Verifies JWT signature and validates user existence.
2. `TenantGuard`: Enforces request tenant context matching session tenant context.
3. `SubscriptionGuard`: Verifies that the tenant holds an `ACTIVE` subscription and has not exceeded message or automation quotas.
4. `HierarchyGuard`: Restricts reseller operations to valid downstream organizations.
5. `SuperAdminGuard`: Protects platform administration endpoints.

### 3. Idempotent Webhook Processing
Incoming webhooks from Meta and payment gateways are logged to `WebhookEvent` with unique event IDs. Duplicate event deliveries from network retries are detected and acknowledged without re-executing business logic.

---

## Environment Configuration Reference

### Backend Configuration (`backend/.env`)

```env
# Application Runtime
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
APP_NAME="Appnix SaaS"
FRONTEND_URL=https://www.appnix.co.in
API_BASE_URL=https://api.appnix.co.in/api/v1

# AWS RDS PostgreSQL
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/appnix_production?schema=public&sslmode=require

# Authentication Secrets (generate via: openssl rand -base64 32)
JWT_ACCESS_SECRET=super_secure_access_secret_key_minimum_32_bytes
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=super_secure_refresh_secret_key_minimum_32_bytes
JWT_REFRESH_EXPIRATION=7d

# AES-256-GCM Encryption Vault (generate via: openssl rand -hex 32)
APP_ENCRYPTION_KEY=64_character_hex_encoded_aes_256_key

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=cloudflare_account_id
R2_ACCESS_KEY_ID=r2_access_key
R2_SECRET_ACCESS_KEY=r2_secret_key
R2_BUCKET_NAME=appnix-media-prod
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# Meta WhatsApp Cloud API & Embedded Signup
META_APP_ID=meta_developer_app_id
META_APP_SECRET=meta_developer_app_secret
META_GRAPH_API_VERSION=v21.0
META_EMBEDDED_SIGNUP_CONFIG_ID=meta_embedded_signup_config_id
META_WEBHOOK_VERIFY_TOKEN=random_secure_verify_token

# Email Service (Brevo SMTP)
BREVO_API_KEY=brevo_api_key
MAIL_FROM_EMAIL=notifications@appnix.co.in
MAIL_FROM_NAME="Appnix Platform"

# Cashfree Payments (India)
CASHFREE_APP_ID=cashfree_app_id
CASHFREE_SECRET_KEY=cashfree_secret_key
CASHFREE_API_VERSION=2023-08-01
CASHFREE_MODE=production # sandbox for testing

# Google OAuth 2.0
GOOGLE_CLIENT_ID=google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=google_client_secret
GOOGLE_CALLBACK_URL=https://api.appnix.co.in/api/v1/auth/google/callback
```

### Frontend Configuration (`frontend/.env.local`)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=google_client_id.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=recaptcha_v3_site_key
```

---

## Local Development Quickstart

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x+
- **PostgreSQL**: v15 or v16 running locally or via Docker
- **Git**

### 1. Clone & Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL DATABASE_URL and secrets

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```
*Backend runs at `http://localhost:4000` with Swagger docs at `http://localhost:4000/api/docs`.*

### 2. Setup Frontend
```bash
cd ../frontend
cp .env.example .env.local  # If template exists, or create .env.local with above variables

npm install
npm run dev
```
*Frontend runs at `http://localhost:3000` with Turbopack.*

### 3. Quality & Type Validation
```bash
# Frontend checks
cd frontend
npm run type-check
npm run lint

# Backend checks
cd ../backend
npm run lint
npm run build
```

---

## Production Infrastructure & Deployment

### Server Architecture
- **Web Frontend**: Hosted on **Vercel** or **AWS EC2** with standalone Next.js server.
- **Backend API**: Hosted on **AWS EC2 Ubuntu 24.04 LTS (t4g.small)** managed via **PM2**.
- **Database**: **AWS RDS PostgreSQL 16 (Multi-AZ)** in private subnets.
- **Media Assets**: **Cloudflare R2** with direct client presigned PUT uploads.
- **Nginx Reverse Proxy**: Terminating SSL with Let's Encrypt Certbot and routing traffic to `127.0.0.1:4000`.

### Health Verification
> Release note: production deployment checkpoints are validated through the health endpoint after each approved release.

Verify running status anytime:
```bash
curl -i https://api.appnix.co.in/api/v1/health
```

---

## Contributing & Code Standards

1. **TypeScript Strictness**: No implicit `any`, strict null checks enforced across both frontend and backend.
2. **Conventional Commits**: Format commit messages as `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, or `chore:`.
3. **Multi-Tenant Isolation**: Never create backend endpoints that query without filtering by `tenantId` from the verified session context.
4. **Credential Security**: Never commit `.env` files or API secrets to version control. Always use the AES-256 encryption service when storing credentials in the database.

---

## License

Proprietary Software — Copyright © 2026 Appnix Technologies Pvt. Ltd. All Rights Reserved.
