// config.js
const config = {
  roleBadgeClasses: {
    Admin: "bg-purple-100 text-purple-700",
    Manager: "bg-blue-100 text-blue-700",
    "Sales Agent": "bg-green-100 text-green-700",
    "Technical Engineer": "bg-amber-100 text-amber-700",
    "Field Service": "bg-indigo-100 text-indigo-700",
  },

  statusBadgeClasses: {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-gray-100 text-gray-700",
    Suspended: "bg-red-100 text-red-700",
  },

  permissions: {
    workorder: ["workorder.read", "workorder.write", "workorder.all"],
    "sales-lead": ["sales-lead.read", "sales-lead.write", "sales-lead.all"],
    "technical-reco": [
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