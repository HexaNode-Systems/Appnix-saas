import { FlowTemplate, FlowChannel } from "./types";

export const CONNECTED_CHANNELS: FlowChannel[] = [
  {
    id: "chan_1",
    name: "01 Automations",
    phoneNumber: "+91 98765 43210",
    status: "CONNECTED",
    wabaId: "waba_991827364501",
  },
  {
    id: "chan_2",
    name: "Appnix Customer Care",
    phoneNumber: "+91 91234 56789",
    status: "CONNECTED",
    wabaId: "waba_882736154902",
  },
  {
    id: "chan_3",
    name: "Global Sales & VIP",
    phoneNumber: "+1 (555) 234-5678",
    status: "CONNECTED",
    wabaId: "waba_773645281903",
  },
];

export const STARTER_TEMPLATES: FlowTemplate[] = [
  {
    id: "tmpl_appointment_booking",
    title: "Doctor & Service Appointment Booking",
    category: "Appointment Booking",
    description:
      "Allow clients to browse available specialists, select a calendar date and time slot, and confirm instant bookings.",
    iconName: "Calendar",
    screensCount: 3,
    badge: "Most Popular",
    previewFields: ["Specialist Selection", "Date & Time Slot Picker", "Patient Details", "Instant Confirmation"],
    screens: [
      {
        id: "SCREEN_SELECT_SLOT",
        title: "Select Service & Slot",
        components: [
          {
            id: "heading_1",
            type: "TextHeading",
            label: "Book Your Appointment",
            description: "Select your desired service and preferred consultation time.",
          },
          {
            id: "field_service",
            type: "Dropdown",
            label: "Select Service / Specialist",
            name: "service_type",
            required: true,
            options: [
              { id: "general_physician", title: "General Consultation (Dr. Sharma)" },
              { id: "dental_care", title: "Dental Checkup & Cleaning" },
              { id: "dermatology", title: "Skin & Dermatology Clinic" },
              { id: "cardiology", title: "Heart & Wellness Screening" },
            ],
          },
          {
            id: "field_date",
            type: "DatePicker",
            label: "Preferred Appointment Date",
            name: "booking_date",
            required: true,
            helperText: "Available Mon - Sat (9:00 AM - 7:00 PM)",
          },
          {
            id: "field_slot",
            type: "RadioGroup",
            label: "Preferred Time Slot",
            name: "time_slot",
            required: true,
            options: [
              { id: "morning", title: "Morning (10:00 AM - 01:00 PM)" },
              { id: "afternoon", title: "Afternoon (02:00 PM - 05:00 PM)" },
              { id: "evening", title: "Evening (05:00 PM - 08:00 PM)" },
            ],
          },
          {
            id: "footer_1",
            type: "Footer",
            label: "Continue to Patient Info",
          },
        ],
        nextScreenId: "SCREEN_PATIENT_INFO",
      },
      {
        id: "SCREEN_PATIENT_INFO",
        title: "Patient Details",
        components: [
          {
            id: "heading_2",
            type: "TextHeading",
            label: "Patient Information",
            description: "Please enter contact details to receive booking alerts & prescription tokens.",
          },
          {
            id: "field_name",
            type: "TextInput",
            label: "Patient Full Name",
            name: "patient_name",
            placeholder: "e.g. Ramesh Kumar",
            required: true,
          },
          {
            id: "field_phone",
            type: "TextInput",
            label: "Contact WhatsApp Number",
            name: "patient_phone",
            placeholder: "+91 98765 43210",
            required: true,
          },
          {
            id: "field_notes",
            type: "TextArea",
            label: "Symptoms or Previous Medical History (Optional)",
            name: "medical_notes",
            placeholder: "Describe briefly any ongoing medication or allergies...",
            required: false,
          },
          {
            id: "footer_2",
            type: "Footer",
            label: "Confirm Appointment Booking",
          },
        ],
        nextScreenId: "SCREEN_SUCCESS",
      },
      {
        id: "SCREEN_SUCCESS",
        title: "Booking Confirmed",
        terminal: true,
        components: [
          {
            id: "heading_3",
            type: "TextHeading",
            label: "Appointment Confirmed! 🎉",
            description: "Your slot has been reserved. You will receive a WhatsApp reminder 2 hours prior.",
          },
          {
            id: "body_summary",
            type: "TextBody",
            label: "Booking Reference: APX-99824\nClinic Location: Appnix Health Hub, 4th Floor, Indiranagar.",
          },
          {
            id: "footer_3",
            type: "Footer",
            label: "Close Flow",
          },
        ],
      },
    ],
  },
  {
    id: "tmpl_lead_generation",
    title: "B2B High-Intent Lead Capture",
    category: "Lead Generation",
    description:
      "Qualify prospective buyers with interactive company size selectors, budget ranges, and project scopes.",
    iconName: "UserPlus",
    screensCount: 3,
    badge: "High Conversion",
    previewFields: ["Company Profile", "Budget & Timeline", "Requirements Checklist", "Sales Handover"],
    screens: [
      {
        id: "SCREEN_LEAD_PROFILE",
        title: "Company & Project Profile",
        components: [
          {
            id: "lead_heading_1",
            type: "TextHeading",
            label: "Get a Custom Enterprise Quote",
            description: "Tell us about your organization and automation requirements.",
          },
          {
            id: "lead_company",
            type: "TextInput",
            label: "Company / Organization Name",
            name: "company_name",
            placeholder: "e.g. Acme Tech Global",
            required: true,
          },
          {
            id: "lead_email",
            type: "TextInput",
            label: "Official Work Email",
            name: "work_email",
            placeholder: "you@company.com",
            required: true,
          },
          {
            id: "lead_size",
            type: "Dropdown",
            label: "Company Size",
            name: "team_size",
            required: true,
            options: [
              { id: "seed", title: "1 - 10 Employees (Startup)" },
              { id: "growth", title: "11 - 50 Employees (Growth)" },
              { id: "mid", title: "51 - 250 Employees (Mid-Market)" },
              { id: "enterprise", title: "250+ Employees (Enterprise)" },
            ],
          },
          {
            id: "lead_footer_1",
            type: "Footer",
            label: "Next: Project Scope & Budget",
          },
        ],
        nextScreenId: "SCREEN_LEAD_BUDGET",
      },
      {
        id: "SCREEN_LEAD_BUDGET",
        title: "Budget & Requirements",
        components: [
          {
            id: "lead_heading_2",
            type: "TextHeading",
            label: "Project Scope & Timelines",
          },
          {
            id: "lead_budget",
            type: "RadioGroup",
            label: "Estimated Monthly Software Budget",
            name: "monthly_budget",
            required: true,
            options: [
              { id: "tier_1", title: "$500 - $1,500 / month" },
              { id: "tier_2", title: "$1,500 - $5,000 / month" },
              { id: "tier_3", title: "$5,000+ / month (Custom SLA)" },
            ],
          },
          {
            id: "lead_channels",
            type: "CheckboxGroup",
            label: "Required Channels & Features",
            name: "feature_requirements",
            options: [
              { id: "whatsapp_flows", title: "WhatsApp Mini-App Flows" },
              { id: "ai_agents", title: "Voice AI & LLM Agent Integration" },
              { id: "crm_sync", title: "Salesforce / HubSpot CRM Two-Way Sync" },
              { id: "payment_links", title: "Cashfree Native Payments" },
            ],
          },
          {
            id: "lead_footer_2",
            type: "Footer",
            label: "Submit & Request Demo",
          },
        ],
        nextScreenId: "SCREEN_LEAD_DONE",
      },
      {
        id: "SCREEN_LEAD_DONE",
        title: "Success Screen",
        terminal: true,
        components: [
          {
            id: "lead_done_heading",
            type: "TextHeading",
            label: "Thank You! Your Request is Logged 🚀",
            description: "A dedicated product specialist has been assigned and will connect within 15 minutes.",
          },
          {
            id: "lead_done_footer",
            type: "Footer",
            label: "Done",
          },
        ],
      },
    ],
  },
  {
    id: "tmpl_csat_survey",
    title: "CSAT & Net Promoter Feedback Survey",
    category: "Feedback & Survey",
    description:
      "Capture instant post-purchase or post-support satisfaction scores directly within WhatsApp chats.",
    iconName: "Star",
    screensCount: 2,
    badge: "Official",
    previewFields: ["1-5 Star CSAT Score", "Aspect Checkboxes", "Comments & Suggestions", "Discount Coupon"],
    screens: [
      {
        id: "SCREEN_CSAT_QUESTIONS",
        title: "Customer Rating",
        components: [
          {
            id: "csat_heading",
            type: "TextHeading",
            label: "How was your recent experience?",
            description: "Your feedback helps us continuously improve our service quality.",
          },
          {
            id: "csat_rating",
            type: "RadioGroup",
            label: "Overall Satisfaction Rating",
            name: "overall_rating",
            required: true,
            options: [
              { id: "5_star", title: "⭐⭐⭐⭐⭐ Outstanding (5/5)" },
              { id: "4_star", title: "⭐⭐⭐⭐ Good (4/5)" },
              { id: "3_star", title: "⭐⭐⭐ Average (3/5)" },
              { id: "2_star", title: "⭐⭐ Needs Improvement (2/5)" },
              { id: "1_star", title: "⭐ Poor Experience (1/5)" },
            ],
          },
          {
            id: "csat_comments",
            type: "TextArea",
            label: "What can we do to make your experience better?",
            name: "user_feedback",
            placeholder: "Type your review or suggestions here...",
            required: false,
          },
          {
            id: "csat_footer_1",
            type: "Footer",
            label: "Submit Feedback",
          },
        ],
        nextScreenId: "SCREEN_CSAT_THANKS",
      },
      {
        id: "SCREEN_CSAT_THANKS",
        title: "Thank You Screen",
        terminal: true,
        components: [
          {
            id: "csat_thanks_heading",
            type: "TextHeading",
            label: "Thank You for Your Feedback! 🎁",
            description: "As a token of appreciation, here is 15% OFF your next order: PROMO CODE: APNX15",
          },
          {
            id: "csat_thanks_footer",
            type: "Footer",
            label: "Close",
          },
        ],
      },
    ],
  },
  {
    id: "tmpl_product_catalog_order",
    title: "Product Catalog & Quick Re-Order",
    category: "Product Catalog / Order",
    description:
      "Allow customers to select products, specify quantities, input delivery address, and proceed to checkout.",
    iconName: "ShoppingBag",
    screensCount: 3,
    previewFields: ["Product Selector", "Quantity & Options", "Delivery Address", "Payment Step"],
    screens: [
      {
        id: "SCREEN_CATALOG_SELECT",
        title: "Choose Items",
        components: [
          {
            id: "order_heading_1",
            type: "TextHeading",
            label: "Quick Store Re-Order",
            description: "Choose items from your regular favorites list.",
          },
          {
            id: "order_item",
            type: "Dropdown",
            label: "Select Product Bundle",
            name: "product_sku",
            required: true,
            options: [
              { id: "bundle_1", title: "Artisan Coffee Beans (Pack of 3) - ₹899" },
              { id: "bundle_2", title: "Organic Green Tea Box (50 Bags) - ₹499" },
              { id: "bundle_3", title: "Cold Brew Sampler Kit - ₹1,199" },
            ],
          },
          {
            id: "order_qty",
            type: "RadioGroup",
            label: "Quantity",
            name: "quantity",
            required: true,
            options: [
              { id: "1", title: "1 Unit" },
              { id: "2", title: "2 Units (5% OFF)" },
              { id: "3", title: "3+ Units (10% OFF)" },
            ],
          },
          {
            id: "order_footer_1",
            type: "Footer",
            label: "Proceed to Delivery Details",
          },
        ],
        nextScreenId: "SCREEN_DELIVERY_ADDRESS",
      },
      {
        id: "SCREEN_DELIVERY_ADDRESS",
        title: "Shipping Address",
        components: [
          {
            id: "order_heading_2",
            type: "TextHeading",
            label: "Delivery Address & Slot",
          },
          {
            id: "order_address",
            type: "TextArea",
            label: "Complete Delivery Address",
            name: "shipping_address",
            placeholder: "Flat / House No, Street, Landmark, City & PIN Code...",
            required: true,
          },
          {
            id: "order_speed",
            type: "RadioGroup",
            label: "Delivery Speed",
            name: "delivery_speed",
            required: true,
            options: [
              { id: "express", title: "Instant Express Delivery (2 Hours) - ₹49" },
              { id: "standard", title: "Standard Delivery (Next Day) - FREE" },
            ],
          },
          {
            id: "order_footer_2",
            type: "Footer",
            label: "Place Order & Pay",
          },
        ],
        nextScreenId: "SCREEN_ORDER_SUCCESS",
      },
      {
        id: "SCREEN_ORDER_SUCCESS",
        title: "Order Placed",
        terminal: true,
        components: [
          {
            id: "order_success_heading",
            type: "TextHeading",
            label: "Order Placed Successfully! 📦",
            description: "Your order has been sent to our dispatch warehouse. Live tracking link will arrive in this chat.",
          },
          {
            id: "order_success_footer",
            type: "Footer",
            label: "Done",
          },
        ],
      },
    ],
  },
  {
    id: "tmpl_customer_support_ticket",
    title: "Customer Support & Issue Escalation",
    category: "Customer Support / Inquiry",
    description:
      "Structured ticket submission with category tags, order number lookup, and urgency priority levels.",
    iconName: "HelpCircle",
    screensCount: 2,
    previewFields: ["Issue Category", "Order Lookup", "Problem Description", "Priority Level"],
    screens: [
      {
        id: "SCREEN_SUPPORT_INTAKE",
        title: "Support Ticket",
        components: [
          {
            id: "support_heading_1",
            type: "TextHeading",
            label: "Raise a Support Request",
            description: "Provide details so our team can resolve your query immediately.",
          },
          {
            id: "support_category",
            type: "Dropdown",
            label: "Issue Type",
            name: "issue_type",
            required: true,
            options: [
              { id: "order_status", title: "Order Tracking & Delivery Status" },
              { id: "payment_refund", title: "Payment Failed / Refund Inquiry" },
              { id: "product_damaged", title: "Damaged / Incorrect Item Received" },
              { id: "account_billing", title: "Account & Invoice Assistance" },
            ],
          },
          {
            id: "support_order_id",
            type: "TextInput",
            label: "Order ID / Invoice Ref (If applicable)",
            name: "order_ref",
            placeholder: "e.g. ORD-89410",
            required: false,
          },
          {
            id: "support_desc",
            type: "TextArea",
            label: "Describe the Issue",
            name: "issue_description",
            placeholder: "Tell us exactly what happened...",
            required: true,
          },
          {
            id: "support_footer_1",
            type: "Footer",
            label: "Submit Ticket to Agent",
          },
        ],
        nextScreenId: "SCREEN_SUPPORT_DONE",
      },
      {
        id: "SCREEN_SUPPORT_DONE",
        title: "Ticket Logged",
        terminal: true,
        components: [
          {
            id: "support_done_heading",
            type: "TextHeading",
            label: "Ticket #SUP-4821 Logged 🎧",
            description: "A customer support representative has been notified and will respond in this chat window.",
          },
          {
            id: "support_done_footer",
            type: "Footer",
            label: "Return to Chat",
          },
        ],
      },
    ],
  },
];
