# Appnix SaaS — NestJS Backend API Engine

[![NestJS](https://img.shields.io/badge/NestJS-10.4-e0234e?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/OpenAPI-Swagger_7.4-85ea2d?logo=swagger)](https://swagger.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)

The backend of **Appnix SaaS** is an enterprise-grade, modular NestJS 10 application providing a secure, multi-tenant API for business messaging (WhatsApp Cloud API v21, Google RCS, Instagram, Facebook), visual automation workflows, CRM contact management, double-entry wallet credits, Cashfree payment processing, and super-admin platform administration.

---

## Table of Contents

1. [Architecture & Design Principles](#architecture--design-principles)
2. [Directory Structure](#directory-structure)
3. [Core Systems & Modules](#core-systems--modules)
   - [Hierarchical Multi-Tenancy Engine](#hierarchical-multi-tenancy-engine)
   - [Authentication & Security Pipeline](#authentication--security-pipeline)
   - [WhatsApp Cloud API & Embedded Signup](#whatsapp-cloud-api--embedded-signup)
   - [Google RCS Business Messaging](#google-rcs-business-messaging)
   - [Broadcast Campaigns Engine](#broadcast-campaigns-engine)
   - [Live Chat & 24h Customer Care Inbox](#live-chat--24h-customer-care-inbox)
   - [CRM Contacts & SuperFields Engine](#crm-contacts--superfields-engine)
   - [Visual Workflows & No-Code Bots](#visual-workflows--no-code-bots)
   - [Key-Value DataStore & Credential Vault](#key-value-datastore--credential-vault)
   - [Billing, Cashfree Orders & Wallet Ledger](#billing-cashfree-orders--wallet-ledger)
   - [Cloudflare R2 Object Storage & Media](#cloudflare-r2-object-storage--media)
   - [Webhooks Ingestion & Signature Verification](#webhooks-ingestion--signature-verification)
   - [Super Admin Governance & Audit Logging](#super-admin-governance--audit-logging)
4. [Prisma Database Schema & Relational Models](#prisma-database-schema--relational-models)
5. [Complete API Endpoints Directory](#complete-api-endpoints-directory)
6. [Guards, Interceptors & Middleware Reference](#guards-interceptors--middleware-reference)
7. [Environment Configuration Reference](#environment-configuration-reference)
8. [Local Development & Database Migrations](#local-development--database-migrations)
9. [Production Deployment & Process Management](#production-deployment--process-management)

---

## Architecture & Design Principles

```
backend/src/
├── common/             # Cross-cutting concerns: Guards, Middleware, Decorators, Interceptors
├── lib/                # AsyncLocalStorage Context Stores, Encryption Utilities
├── prisma/             # PrismaService & Database Client lifecycle
└── modules/            # 30 Self-contained Domain Modules
```

- **Modular Domain Architecture**: Each feature belongs to an isolated NestJS module encapsulating its Controller, Service, DTOs, and dependency injection graph.
- **Strict Multi-Tenant Isolation**: Tenant boundaries are resolved at the HTTP layer via `TenantContextMiddleware` using custom domains, subdomain slugs, or `X-Tenant-Id` headers. Every service query filters strictly by `tenantId`.
- **AsyncLocalStorage Context**: Requests maintain tenant and user principals in Node.js `AsyncLocalStorage` via `TenantContextStore`, eliminating context-leaking risks across async operations.
- **At-Rest Encryption**: API keys, Meta WABA system user tokens, and integration credentials are encrypted at rest using **AES-256-GCM**.
- **Double-Entry Wallet Accounting**: Per-message broadcast usage debits are tracked line-by-line with support for automated failure refunds.

---

## Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma                  # Prisma ORM schema (20+ models & enums)
│   └── migrations/                    # SQL migration history
├── src/
│   ├── common/
│   │   ├── decorators/                # @CurrentUser(), @TenantId()
│   │   ├── filters/                   # HttpExceptionFilter, PrismaClientExceptionFilter
│   │   ├── guards/                    # TenantGuard, HierarchyGuard, SubscriptionGuard
│   │   ├── interceptors/              # SupportAuditInterceptor (impersonation audit)
│   │   └── middleware/                # TenantContextMiddleware
│   ├── lib/
│   │   ├── auth/                      # TenantContextStore, SessionContext
│   │   └── crypto/                    # AES-256-GCM encrypt/decrypt utilities
│   ├── modules/
│   │   ├── analytics/                 # Messaging & revenue analytics
│   │   ├── app-credentials/           # 3rd-party integration vault
│   │   ├── auth/                      # JWT, Google OAuth 2.0, OTP verification, 2FA
│   │   ├── billing/                   # Cashfree checkout, subscriptions, invoices
│   │   ├── bots/                      # Interactive chatbot flows & versions
│   │   ├── campaigns/                 # 7-step broadcast campaign manager
│   │   ├── channels/                  # WhatsApp, Instagram, Facebook, RCS
│   │   ├── chat/                      # Omnichannel live chat inbox & 24h window
│   │   ├── contact-tags/              # Contact tag taxonomies
│   │   ├── crm/                       # Contacts directory, CSV import, segments
│   │   ├── dashboard/                 # Overview KPIs & recent activity
│   │   ├── data-store/                # Workflow key-value data storage with TTL
│   │   ├── department/                # Department hierarchy, roles, analytics
│   │   ├── health/                    # Health checks (DB, R2, memory)
│   │   ├── mail/                      # Brevo SMTP transactional mailer
│   │   ├── media/                     # Presigned R2 uploads & metadata
│   │   ├── notifications/             # User & workspace notifications
│   │   ├── settings/                  # User profile, password, security
│   │   ├── storage/                   # S3 / Cloudflare R2 client service
│   │   ├── super-admin/               # Super admin operations & impersonation
│   │   ├── super-fields/              # Dynamic custom attributes schema
│   │   ├── support/                   # Customer support tickets & replies
│   │   ├── team/                      # Staff team members & invitations
│   │   ├── tenants/                   # Multi-tenant hierarchy & white-label branding
│   │   ├── users/                     # User management within tenant
│   │   ├── webhooks/                  # Meta and Cashfree payment webhooks
│   │   ├── whatsapp-templates/        # Meta templates sync & review simulator
│   │   ├── workflows/                 # Visual drag-and-drop automation workflows
│   │   └── workspace/                 # Workspace settings, API keys, wallet
│   ├── app.module.ts                  # Root application module
│   └── main.ts                        # Bootstrap, CORS, Swagger, ValidationPipe
├── DEPLOYMENT.md                      # EC2 + RDS + PM2 deployment guide
├── Dockerfile                         # Production Docker container definition
├── ecosystem.config.js                # PM2 cluster configuration
├── package.json
└── tsconfig.json
```

---

## Core Systems & Modules

### Hierarchical Multi-Tenancy Engine

The system organizes organizations in a **Materialized Path Tree**:
- `TenantTier`: `PLATFORM_ROOT`, `PRIMARY_RESELLER`, `SUB_RESELLER`, `END_CLIENT`.
- Each tenant record contains `path` (e.g., `root.reseller_a.client_b`), `depth`, and `parentId`.
- **Domain Resolution**: `TenantContextMiddleware` resolves incoming requests by checking:
  1. `X-Tenant-Id` or `X-Workspace-Id` header (if valid)
  2. `Host` header against `customDomain` or `DomainMapping`
  3. Host prefix against `Tenant.slug` (e.g., `agency1.appnix.co.in`)
  4. Platform root domain (`admin.appnix.co.in` or `admin.localhost`)
  5. Caching resolution results in an in-memory LRU cache for 60 seconds.
- **Hierarchy Boundary Protection**: `HierarchyGuard` prevents cross-tenant access. A `RESELLER_ADMIN` can only manage tenants whose `path` begins with their own path prefix (`caller.orgPath + '.'`).

### Authentication & Security Pipeline

- **JWT Tokens**:
  - `JWT_ACCESS_SECRET` (15m expiry): Sent via `Authorization: Bearer <token>` or `appnix_access_token` HttpOnly cookie.
  - `JWT_REFRESH_SECRET` (7d expiry, extended to 30d for remember-me): Stored as a hashed bcrypt string in `users.hashedRefreshToken`.
- **Password Security**: Passwords hashed using `bcryptjs` with salt factor 10.
- **Google OAuth 2.0**: Handles Google One-Tap tokens (`POST /api/v1/auth/google`) and web redirects (`GET /api/v1/auth/google/callback`). Automatically links or provisions tenant accounts.
- **Password Reset & OTP**: Generates 6-digit random verification OTPs stored with timestamp expiries in `users.passwordResetExpiry`. Delivered via Brevo transactional email.

### WhatsApp Cloud API & Embedded Signup

- **Embedded Signup**: The frontend loads Meta's Facebook JavaScript SDK. Upon user consent, the backend receives the authorization code, exchanges it with Meta Graph API (`v21.0`) for a permanent system user token, subscribes webhooks, and creates a verified `ChannelConfig`.
- **Template Synchronization**: Bi-directional sync of WhatsApp message templates (`MARKETING`, `UTILITY`, `AUTHENTICATION`) with interactive components (Quick Replies, Call-to-Action buttons, media headers).
- **Inbound Webhook Engine**: Validates `x-hub-signature-256` HMAC-SHA256 signature using `META_APP_SECRET`. Dispatches messages to conversations and updates delivery receipts.

### Google RCS Business Messaging

- **Rich Card & Carousel Designer**: Manages RCS templates with standalone action buttons, dial numbers, URL links, and carousel cards.
- **Carrier Approvals**: Tracks carrier submission statuses (`DRAFT -> PENDING -> APPROVED -> REJECTED`).

### Broadcast Campaigns Engine

- **State Machine**:
  `DRAFT` -> `READY_FOR_TEST` -> `TEST_SENT` -> `SCHEDULED` -> `LAUNCHING` -> `RUNNING` -> `COMPLETED` / `FAILED`.
- **Pre-Flight Verification**: Assesses wallet balance against anticipated campaign cost (audience count * unit rate).
- **Test Send**: Allows sending an immediate test payload to a verified phone number before committing the broadcast.
- **Auto-Refund**: If a message delivery receipt fails from the telecom carrier, an instant credit is refunded to the tenant's `Wallet`.

### Live Chat & 24h Customer Care Inbox

- **Unified Inbox**: WhatsApp, RCS, Instagram, and Facebook conversations merged in one unified structure.
- **24-Hour Care Window**: Computes remaining time based on the timestamp of the last customer inbound message.
- **Agent Collaboration**: Team members can attach internal private notes, customer sentiment remarks (`positive`, `neutral`, `negative`), lead stages, and custom tags.

### CRM Contacts & SuperFields Engine

- **SuperFields**: User-defined dynamic attributes supporting 14 data types:
  `TEXT`, `TEXTAREA`, `DROPDOWN`, `MULTI_SELECT`, `NUMERIC`, `DECIMAL`, `AMOUNT`, `EMAIL`, `PHONE`, `URL`, `ADDRESS`, `DATE`, `DATETIME`, `PERIODIC_TIME`.
- **Audience Segmentation**: Enables creating targeted lists using rule-based filter logic.
- **Bulk CSV Importer**: Pre-validates CSV columns, checks for invalid phone numbers or duplicates, and processes records in batches.

### Visual Workflows & No-Code Bots

- **Graph Storage**: Workflows store `nodes` and `edges` JSON canvas representations.
- **Trigger Types**: `INBOUND_MESSAGE`, `WEBHOOK_EVENT`, `SCHEDULED_CRON`, `FORM_SUBMISSION`.
- **Execution History**: Logs node execution states, input payloads, and transition branches.

### Key-Value DataStore & Credential Vault

- **DataStore**: Dynamic document storage for workflows. Supports string/numeric lookup keys, structured JSON values, and automatic TTL expiration.
- **Credential Encryption**: Encrypts 3rd-party tokens (Shopify, OpenAI, Cashfree, HubSpot) at rest using AES-256-GCM.

### Billing, Cashfree Orders & Wallet Ledger

- **Cashfree Gateway**: Creates payment orders via Cashfree API v2023-08-01. Returns `payment_session_id` for frontend drop-in UI.
- **Webhook Activation**: Verifies Cashfree webhook signature, updates order status, provisions plan quotas, and issues tax invoices.
- **Wallet & Transactions**:
  - `Wallet`: Prepaid balance in INR with low-balance alerts and auto-recharge triggers.
  - `ChannelTransaction`: Granular per-message charge log (base rate, platform fee, taxes, delivery status).

### Cloudflare R2 Object Storage & Media

- **Direct Upload Flow**: Frontend requests a presigned PUT URL via `POST /api/v1/media/presigned-upload`. The frontend uploads directly to Cloudflare R2, preventing file uploads from congesting the API server.
- **Upload Confirmation**: Client invokes `POST /api/v1/media/:id/confirm` to activate the media record.
- **File Limits**:
  - Images: Max 10MB
  - Documents: Max 25MB
  - Audio: Max 16MB
  - Video: Max 64MB

### Webhooks Ingestion & Signature Verification

- **Meta Hub Challenge**: Handles `GET /api/v1/webhooks/meta` verification challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- **Signature Security**: Verifies `x-hub-signature-256` for Meta and `x-webhook-signature` for Cashfree.
- **Idempotency**: Every event is stored in `webhook_events` with unique `eventId`. Duplicate deliveries return `200 OK` without duplicate processing.

### Super Admin Governance & Audit Logging

- **Support Impersonation**: Generates short-lived support tokens (`X-Impersonation-Token`) for authorized workspace diagnosis.
- **Immutable Audit Trail**: Logs every administrative and impersonation action to `audit_logs`.

---

## Prisma Database Schema & Relational Models

```prisma
// Summary of Primary Relational Models:
Tenant               - Organization hierarchy, white-label branding, quotas, limits
DomainMapping        - Custom hostnames, SSL provisioning status
AuditLog             - Super Admin impersonation & administrative audit trail
User                 - Authentication credentials, roles, preferences
Subscription         - Active workspace plan, quota usage, expiration dates
Plan                 - Plan definitions, monthly messages, seat limits, pricing
PaymentOrder         - Cashfree payment order sessions & payment IDs
Invoice              - Billing tax invoices & download URLs
Wallet               - Prepaid credit balance, auto-recharge settings
WalletTransaction    - Top-up and balance modification records
ChannelTransaction   - Itemized per-message billing ledger & delivery status
CrmContact           - Contact directory, phone, email, tags, dynamic field values
SuperField           - Dynamic custom attribute schema definitions
ContactTag           - Categorization tags, colors, and iconography
Conversation         - Omnichannel chat conversations, 24h window, agent assignments
Message              - Chat message history, media URLs, delivery statuses
Campaign             - Broadcast campaigns, scheduling, template variable mappings
CampaignAudience     - Audience segment targeting lists
ChannelConfig        - Channel API credentials & verification states
MetaTemplate         - Synced WhatsApp Cloud API message templates
RcsTemplate          - Google RCS rich cards & carousels
Folder               - Organizational folders for workflows and bots
Workflow             - Visual canvas node and edge graphs
WorkflowLicense      - License keys for unlocking premium templates
DataStore            - Key-value JSON storage for workflow executions
DataStoreRecord      - DataStore key-value documents with TTL
AppCredential        - AES-256-GCM encrypted 3rd-party integration credentials
Department           - Department organization units
RolePermission       - Granular role-based access control definitions
SupportTicket        - Customer support tickets and threaded replies
ActivityLog          - Workspace activity events
Notification         - User notification alerts
Bot                  - Interactive chatbot flow graphs and versions
WebhookEvent         - Idempotent log of processed incoming webhooks
Media                - Uploaded assets in Cloudflare R2 / S3 storage
```

---

## Complete API Endpoints Directory

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/signup` | Create new tenant workspace & initial admin | No |
| `POST` | `/login` | User login; issues JWT cookies & bearer tokens | No |
| `POST` | `/admin/login` | Admin portal sign-in with role verification | No |
| `POST` | `/refresh` | Rotate access token using refresh token | Refresh Token |
| `GET`  | `/me` | Get current authenticated user profile | Access Token |
| `POST` | `/logout` | Invalidate refresh token & clear cookies | Access Token |
| `POST` | `/forgot-password` | Dispatch 6-digit password reset OTP | No |
| `POST` | `/verify-otp` | Verify email OTP code | No |
| `POST` | `/resend-otp` | Resend verification OTP | No |
| `POST` | `/reset-password` | Reset password using verified token/OTP | No |
| `GET`  | `/google` | Initiate Google OAuth 2.0 redirect | No |
| `GET`  | `/google/callback` | Google OAuth redirect callback | No |
| `POST` | `/google` | Google One-Tap / ID token verification | No |

### Tenants & Hierarchy (`/api/v1/tenants`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/resolve-domain` | Resolve hostname to tenant white-label branding | No |
| `GET`  | `/` | List all tenants scoped to caller hierarchy | Access Token |
| `GET`  | `/hierarchy` | Organization tree for resellers & super admin | Access Token |
| `GET`  | `/:id` | Get single tenant details | Access Token |
| `POST` | `/` | Create new tenant or downstream sub-reseller | Access Token |
| `PATCH`| `/:id/branding` | Update white-label logo, colors, custom domain | Access Token |

### Campaigns (`/api/v1/campaigns` & `/api/v1/crm/campaigns`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/` | Create new campaign draft | Access Token |
| `GET`  | `/` | Get paginated campaign list | Access Token |
| `GET`  | `/audiences` | Available audience segments | Access Token |
| `GET`  | `/channels` | Configured communication channels | Access Token |
| `GET`  | `/templates` | Approved broadcast templates | Access Token |
| `POST` | `/templates/refresh` | Sync templates from Meta Graph API | Access Token |
| `GET`  | `/stats` | Aggregated campaign metrics | Access Token |
| `GET`  | `/:id` | Get campaign details | Access Token |
| `PUT`  | `/:id` | Update campaign details | Access Token |
| `PUT`  | `/:id/audience` | Assign audience segment to campaign | Access Token |
| `PUT`  | `/:id/channel` | Select broadcast channel | Access Token |
| `PUT`  | `/:id/template` | Select message template | Access Token |
| `PUT`  | `/:id/configure-template` | Map template variables to contact attributes | Access Token |
| `POST` | `/:id/test` | Send live test message to phone number | Access Token |
| `POST` | `/:id/validate` | Pre-flight validation before launch | Access Token |
| `POST` | `/:id/launch` | Launch campaign immediately | Access Token |
| `POST` | `/:id/schedule` | Schedule campaign for future timestamp | Access Token |
| `DELETE`| `/:id` | Delete campaign draft | Access Token |

### Live Chat & Inbox (`/api/v1/chat` & `/api/v1/inbox`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/conversations` | Get conversations with search & channel filter | Access Token |
| `GET`  | `/conversations/:id` | Get conversation thread & message history | Access Token |
| `POST` | `/conversations/:id/messages` | Send live outbound message | Access Token |
| `POST` | `/conversations/:id/notes` | Add internal team note | Access Token |
| `POST` | `/conversations/:id/remarks` | Update lead stage & sentiment | Access Token |
| `POST` | `/conversations/:id/tags` | Update conversation tags | Access Token |
| `POST` | `/bulk-action` | Bulk transfer, mark read, or close | Access Token |

### Channels (`/api/v1/channels`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | Get status of all channels | Access Token |
| `GET`  | `/whatsapp/config-public` | Public Meta App ID & Config ID for SDK | No |
| `GET`  | `/whatsapp/status` | Verified WABA details & health | Access Token |
| `POST` | `/whatsapp/embedded-signup` | Process Embedded Signup onboarding callback | Access Token |
| `POST` | `/whatsapp/sync` | Re-sync WhatsApp limits with Meta | Access Token |
| `POST` | `/connect` | Connect channel account | Access Token |
| `POST` | `/disconnect/:channel` | Disconnect communication channel | Access Token |
| `GET`  | `/balance` | Channel balance and spend summary | Access Token |
| `GET`  | `/transactions` | Channel debit/credit ledger | Access Token |
| `GET`  | `/statistics` | Delivery statistics breakdown | Access Token |

### WhatsApp Templates (`/api/v1/channels/whatsapp/templates`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List templates with status filters | Access Token |
| `GET`  | `/:id` | Get single template details | Access Token |
| `POST` | `/` | Create template & submit to Meta | Access Token |
| `PUT`  | `/:id` | Update template content | Access Token |
| `POST` | `/:id/submit` | Submit template for Meta review | Access Token |
| `POST` | `/:id/duplicate` | Duplicate existing template | Access Token |
| `DELETE`| `/:id` | Delete template from Meta & database | Access Token |
| `POST` | `/:id/simulate-review` | Sandbox review simulation | Access Token |
| `GET`  | `/flows/quota` | Interactive flow quotas | Access Token |
| `POST` | `/flows/unlock` | Unlock flow limits using license key | Access Token |

### RCS Templates (`/api/v1/channels/rcs/templates`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List RCS templates | Access Token |
| `GET`  | `/:id` | Single RCS template details | Access Token |
| `POST` | `/` | Create Rich Card / Carousel template | Access Token |
| `PUT`  | `/:id` | Update RCS template | Access Token |
| `POST` | `/:id/submit` | Submit template for carrier approval | Access Token |
| `DELETE`| `/:id` | Delete RCS template | Access Token |

### CRM Contacts (`/api/v1/contacts` & `/api/v1/crm/contacts`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List all contacts for tenant | Access Token |
| `POST` | `/` | Create contact | Access Token |
| `GET`  | `/:id` | Get single contact details | Access Token |
| `PATCH`| `/:id` | Update contact | Access Token |
| `DELETE`| `/:id` | Remove contact | Access Token |
| `POST` | `/validate-csv` | Validate CSV columns and formats | Access Token |
| `POST` | `/bulk-import` | Bulk import contacts with duplicate handling | Access Token |
| `GET`  | `/import-history` | View historical import batches | Access Token |
| `POST` | `/bulk-delete` | Delete array of contacts by ID | Access Token |
| `GET`  | `/export` | Export contacts list | Access Token |
| `GET`  | `/segments` | List audience segments | Access Token |
| `POST` | `/segments` | Create audience segment | Access Token |
| `DELETE`| `/segments/:id` | Delete audience segment | Access Token |

### SuperFields (`/api/v1/super-fields`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List custom SuperFields | Access Token |
| `GET`  | `/metrics` | SuperFields usage statistics | Access Token |
| `GET`  | `/:id` | Single SuperField definition | Access Token |
| `POST` | `/` | Create new SuperField | Access Token |
| `PUT`  | `/:id` | Update field validation & placement | Access Token |
| `POST` | `/:id/duplicate` | Duplicate SuperField | Access Token |
| `PATCH`| `/:id/archive` | Archive field definition | Access Token |
| `DELETE`| `/:id` | Delete SuperField | Access Token |

### Workflows (`/api/v1/automations/workflows`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List workflows | Access Token |
| `POST` | `/` | Create visual workflow | Access Token |
| `GET`  | `/quota` | Workflow allowance quota | Access Token |
| `GET`  | `/folders` | List workflow folders | Access Token |
| `POST` | `/folders` | Create workflow folder | Access Token |
| `DELETE`| `/folders/:id` | Delete workflow folder | Access Token |
| `GET`  | `/analytics` | Workflow execution analytics | Access Token |
| `GET`  | `/templates` | Pre-built workflow templates | Access Token |
| `POST` | `/templates/:id/clone` | Clone template to workspace | Access Token |
| `GET`  | `/:id` | Get workflow nodes & edges | Access Token |
| `PUT`  | `/:id` | Save canvas nodes & edges | Access Token |
| `POST` | `/:id/toggle` | Toggle workflow active status | Access Token |
| `POST` | `/:id/execute` | Test run workflow execution | Access Token |
| `GET`  | `/:id/history` | Execution log history | Access Token |
| `DELETE`| `/:id` | Delete workflow | Access Token |

### DataStore (`/api/v1/automations/data-stores`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | List data stores | Access Token |
| `POST` | `/` | Create data store | Access Token |
| `GET`  | `/summary` | Data store metrics | Access Token |
| `GET`  | `/:id` | Get data store metadata | Access Token |
| `DELETE`| `/:id` | Delete data store | Access Token |
| `GET`  | `/:id/records` | Query records within store | Access Token |
| `POST` | `/:id/records` | Upsert key-value record (with TTL) | Access Token |
| `DELETE`| `/:id/records/:key` | Delete record | Access Token |
| `POST` | `/:id/clear` | Clear all records in store | Access Token |

### App Credentials (`/api/v1/automations/app-credentials`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/catalog` | Available app catalog (Shopify, OpenAI, etc.) | Access Token |
| `GET`  | `/summary` | Summary of connected credentials | Access Token |
| `GET`  | `/` | List saved app credentials | Access Token |
| `POST` | `/` | Store encrypted credentials | Access Token |
| `POST` | `/validate-live` | Test connection with provider API | Access Token |
| `GET`  | `/:id` | Get credential metadata | Access Token |
| `PATCH`| `/:id` | Update credential | Access Token |
| `DELETE`| `/:id` | Delete credential | Access Token |
| `POST` | `/:id/test` | Test saved integration connection | Access Token |

### Billing (`/api/v1/billing` & `/api/v1/workspace/billing`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/plans` | Available subscription tiers | No |
| `GET`  | `/subscription` | Workspace subscription & quotas | Access Token |
| `GET`  | `/invoices` | Tax invoice history | Access Token |
| `POST` | `/checkout` | Create Cashfree payment order | Access Token |
| `POST` | `/activate-payment` | Activate subscription upon payment | Access Token |
| `POST` | `/trial` | Activate eligible plan trial | Access Token |
| `POST` | `/cancel` | Cancel active subscription | Access Token |
| `POST` | `/admin/assign` | Super Admin manual plan assignment | Super Admin |

### Workspace & Wallet (`/api/v1/workspace`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/account-settings` | Profile, API keys, webhook URLs | Access Token |
| `PUT`  | `/account-settings` | Update workspace settings | Access Token |
| `POST` | `/api-keys/regenerate` | Regenerate production API secret key | Access Token |
| `GET`  | `/wallet` | Wallet balance & spend metrics | Access Token |
| `POST` | `/wallet/topup` | Top up credit wallet | Access Token |
| `PUT`  | `/wallet/auto-recharge` | Configure auto-recharge rules | Access Token |

### Media & Storage (`/api/v1/media`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/presigned-upload` | Request presigned PUT URL for Cloudflare R2 | Access Token |
| `POST` | `/:id/confirm` | Confirm upload & activate media record | Access Token |
| `GET`  | `/` | List media files | Access Token |
| `GET`  | `/:id` | Get media metadata | Access Token |
| `GET`  | `/:id/download-url` | Generate signed GET download URL | Access Token |
| `DELETE`| `/:id` | Delete media object | Access Token |

### Webhooks (`/api/v1/webhooks`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/meta` | Meta Webhook Challenge verification | No |
| `POST` | `/meta` | Meta Inbound messages & delivery status | HMAC Signature |
| `POST` | `/cashfree` | Cashfree payment webhook | Signature |

### Super Admin (`/api/v1/super-admin`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/impersonation` | Issue short-lived support token for workspace | Super Admin |

### Health (`/api/v1/health`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | Database, R2 storage, and memory status | No |

---

## Guards, Interceptors & Middleware Reference

1. **`TenantContextMiddleware`** (`src/common/middleware/tenant-context.middleware.ts`):
   - Applied globally to all routes (`*`).
   - Extracts hostname from `Host` header or `X-Tenant-Id`.
   - Resolves tenant via in-memory LRU cache or PostgreSQL database.
   - Populates `req.tenant` and injects context into `TenantContextStore` (AsyncLocalStorage).
   - Verifies JWT from `Authorization` header or `appnix_access_token` cookie and attaches `req.user`.

2. **`JwtAccessGuard`** (`src/modules/auth/guards/jwt-access.guard.ts`):
   - Validates the access token signature and attaches decoded user principal.

3. **`TenantGuard`** (`src/common/guards/tenant.guard.ts`):
   - Validates that the active tenant in request headers or params matches the authenticated user's tenant ID.

4. **`HierarchyGuard`** (`src/common/guards/hierarchy.guard.ts`):
   - Enforces materialized path tree hierarchy rules for multi-tier reselling.

5. **`SubscriptionGuard`** (`src/common/guards/subscription.guard.ts`):
   - Blocks access to broadcast and automation execution if the tenant subscription is inactive or message quotas are exhausted.

6. **`SuperAdminGuard`** (`src/modules/auth/guards/super-admin.guard.ts`):
   - Restricts sensitive administrative operations exclusively to `SUPER_ADMIN` roles.

7. **`SupportAuditInterceptor`** (`src/common/interceptors/support-audit.interceptor.ts`):
   - Automatically logs any operation conducted under an impersonated `X-Impersonation-Token` to the `AuditLog` table.

---

## Environment Configuration Reference

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
# Application Runtime
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
APP_NAME="Appnix SaaS"
FRONTEND_URL=https://www.appnix.co.in
API_BASE_URL=https://api.appnix.co.in/api/v1

# AWS RDS PostgreSQL
DATABASE_URL=postgresql://appnix_master:YOUR_PASSWORD@rds-endpoint:5432/appnix_production?schema=public&sslmode=require

# Authentication & Security
JWT_ACCESS_SECRET=openssl_rand_base64_32_access_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=openssl_rand_base64_32_refresh_secret
JWT_REFRESH_EXPIRATION=7d

# AES-256-GCM Credential Encryption Key
APP_ENCRYPTION_KEY=64_character_hex_encoded_aes_256_key

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=cloudflare_account_id
R2_ACCESS_KEY_ID=r2_access_key_id
R2_SECRET_ACCESS_KEY=r2_secret_access_key
R2_BUCKET_NAME=appnix-saas-media
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# Media Upload Limits (MB)
MAX_IMAGE_SIZE_MB=10
MAX_DOCUMENT_SIZE_MB=25
MAX_AUDIO_SIZE_MB=16
MAX_VIDEO_SIZE_MB=64

# Meta Cloud API & Embedded Signup
META_APP_ID=meta_developer_app_id
META_APP_SECRET=meta_developer_app_secret
META_GRAPH_API_VERSION=v21.0
META_EMBEDDED_SIGNUP_CONFIG_ID=meta_embedded_signup_config_id
META_WEBHOOK_VERIFY_TOKEN=secure_random_webhook_verify_token

# Email Service (Brevo)
BREVO_API_KEY=brevo_smtp_api_key
MAIL_FROM_EMAIL=notifications@appnix.co.in
MAIL_FROM_NAME="Appnix Platform"

# Cashfree Payments (India)
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_API_VERSION=2023-08-01
CASHFREE_MODE=sandbox # 'production' in live environment

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.appnix.co.in/api/v1/auth/google/callback
```

---

## Local Development & Database Migrations

### Installation
```bash
cd backend
npm install
```

### Database Synchronization & Prisma Generation
```bash
# Generate Prisma Client types
npm run prisma:generate

# Run schema migrations locally
npm run prisma:migrate:dev

# Open visual database browser
npm run prisma:studio
```

### Running the Server
```bash
# Development mode with hot-reload
npm run start:dev

# Debug mode
npm run start:debug

# Production compiled start
npm run build
npm run start:prod
```

API documentation will be accessible at `http://localhost:4000/api/docs`.

---

## Production Deployment & Process Management

### PM2 Process Cluster
```bash
# Start cluster defined in ecosystem.config.js
pm2 start ecosystem.config.js

# View real-time cluster status & metrics
pm2 status
pm2 logs backend

# Save configuration for automatic reboot
pm2 save
pm2 startup
```

### Docker Containerization
```bash
# Build production Docker image
docker build -t appnix-backend:latest .

# Run container
docker run -d --name appnix-backend \
  -p 4000:4000 \
  --env-file .env \
  appnix-backend:latest
```

---

## License

Proprietary Software — Copyright © 2026 Appnix Technologies Pvt. Ltd. All Rights Reserved.
