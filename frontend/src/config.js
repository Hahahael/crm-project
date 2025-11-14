import { salesLeads } from "../../backend/mocks/salesleadsMock";

// config.js
const config = {
  roleBadgeClasses: {
    Admin: "bg-purple-100 text-purple-700",
    Finance: "bg-blue-100 text-blue-700",
    "Finance-Admin": "bg-blue-100 text-blue-700",
    Sales: "bg-green-100 text-green-700",
    "Sales-Admin": "bg-green-100 text-green-700",
    Warehouse: "bg-fuchsia-100 text-fuchsia-700",
    "Warehouse-Admin": "bg-fuchsia-100 text-fuchsia-700",
    Purchasing: "bg-indigo-100 text-indigo-700",
    "Purchasing-Admin": "bg-indigo-100 text-indigo-700",
    Marketing: "bg-lime-100 text-lime-700",
    "Marketing-Admin": "bg-lime-100 text-lime-700",
    Logistics: "bg-orange-100 text-orange-700",
    "Logistics-Admin": "bg-orange-100 text-orange-700",
    Service: "bg-yellow-100 text-yellow-700",
    "Service-Admin": "bg-yellow-100 text-yellow-700",
    System: "bg-slate-100 text-slate-700",
    "System-Admin": "bg-slate-100 text-slate-700",
  },

  statusBadgeClasses: {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-yellow-100 text-yellow-700",
    Suspended: "bg-red-100 text-red-700",
  },

  // RFQ Status badges
  rfqStatusBadgeClasses: {
    Draft: "bg-gray-50 text-gray-600",
    "Pending Approval": "bg-yellow-100 text-yellow-800",
    Sent: "bg-blue-50 text-blue-700",
    Responded: "bg-green-50 text-green-700",
    Completed: "bg-green-50 text-green-700",
    Cancelled: "bg-red-50 text-red-700",
    Approved: "bg-green-50 text-green-700",
  },

  // Work Order Status badges
  workOrderStatusBadgeClasses: {
    Draft: "bg-gray-50 text-gray-600",
    "Pending Approval": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-50 text-blue-700",
    Completed: "bg-green-50 text-green-700",
    Cancelled: "bg-red-50 text-red-700",
    Approved: "bg-green-50 text-green-700",
  },

  // UI Constants
  ui: {
    // Common transition durations (in milliseconds)
    transitions: {
      fast: 150,
      normal: 300,
      slow: 500,
      notification: 5000,
    },
    
    // Common delays and timeouts
    delays: {
      searchDebounce: 300,
      loadingSimulation: 500,
      notificationHide: 3000,
    },

    // Modal sizes
    modalSizes: {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      xlarge: 'max-w-6xl',
      fullHeight: 'max-h-[80vh]',
      fullHeightLarge: 'max-h-[90vh]',
    },

    // Z-index management
    zIndex: {
      modal: 50,
      overlay: 40,
      notification: 50,
      tooltip: 60,
    },
  },

  // Business rules and constants
  business: {
    // Tax and financial
    vatRate: 0.05, // 5% VAT
    currencySymbol: '₱',
    
    // File upload limits
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    
    // Validation patterns
    validation: {
      phone: /^\+?[0-9\s\-().]{7,20}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      time: /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
    },

    // Common date formats (to work with your existing formatDate function)
    dateFormats: {
      display: 'MM/DD/YYYY',
      input: 'YYYY-MM-DD',
      datetime: 'YYYY-MM-DD HH:mm',
      readable: 'MMMM D, YYYY h:mm A',
      dateOnly: 'YYYY-MM-DD',
    },
  },

  // Component base classes (to reduce duplication)
  components: {
    // Badge base classes
    baseBadge: "inline-flex items-center px-2.5 py-0.5 text-xs",
    badgeRounded: "rounded-full",
    
    // Button base classes  
    baseButton: "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow rounded-md",
    buttonSizes: {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 py-2 text-sm", 
      lg: "h-10 px-6 py-2 text-base",
    },
    buttonVariants: {
      primary: "bg-purple-600 hover:bg-purple-700 text-white",
      secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
      success: "bg-green-500 hover:bg-green-600 text-white",
      warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
      danger: "bg-red-500 hover:bg-red-600 text-white",
      info: "bg-blue-500 hover:bg-blue-600 text-white",
    },

    // Input base classes
    baseInput: "flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors",
    
    // Card base classes  
    baseCard: "rounded-xl border border-gray-200 bg-white shadow-sm p-6",
    
    // Notification base classes
    baseNotification: "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md transition-all duration-500",
    notificationVariants: {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white", 
      info: "bg-blue-500 text-white",
    },
  },

  permissions: {
    workorder: ["workorder.read", "workorder.write", "workorder.all"],
    salesLead: ["sales-lead.read", "sales-lead.write", "sales-lead.all"],
    technicalReco: [
      "technical-reco.read",
      "technical-reco.write",
      "technical-reco.all",
    ],
    rfq: ["rfq.read", "rfq.write", "rfq.all"],
    naef: ["naef.read", "naef.write", "naef.all"],
    quotation: ["quotation.read", "quotation.write", "quotation.all"],
    approval: ["approval.read", "approval.write", "approval.all"],
    user: ["user.read", "user.write", "user.all"],
    global: ["all"], // catch-all permission
  },
};

export default config;
