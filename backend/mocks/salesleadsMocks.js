export const salesLeads = [
  {
    id: 1,
    slNumber: "FSL-2025-0001",
    salesStage: "Sales Lead",
    endUser: "Acme",
    designation: "Production Manager",
    department: "Manufacturing",
    immediateSupport: "John Smith",
    contactNo: "123-456-7890",
    emailAddress: "john.smith@acme.com",
  
    // Application Details
    category: "Direct application, Replacement",
    application: "Industrial Automation",
    machine: "Conveyor Belt System",
    machineProcess: "Assembly Line",
    neededProduct: "Motor Controller",
    existingSpecifications: "240V, 3-phase, 50Hz",
    issuesWithExisting: "Frequent breakdowns, high maintenance cost",
    consideration: "Cost-effective solution with minimal downtime",
  
    // Support and Quotation
    supportNeeded: "Technical consultation, Installation support",
    urgency: "High - Production affected",
    modelToQuote: "MC-5000 Series",
    quantity: 10,
    quantityAttention: "Production Manager",
    qrCc: "procurement@acme.com",
    qrEmailTo: "john.smith@acme.com, procurement@acme.com",
    nextFollowupDate: "2023-06-15",
    dueDate: "2023-06-20",
    doneDate: "2023-06-18",
  
    // Field Sales Lead Details
    account: "Acme Corporation",
    industry: "Manufacturing",
    seId: 1, // You may want to map "Michael Johnson" to a user ID in your users mock
    salesPlanRep: "",
    fslRef: "SL-2023-0089",
    date: "2023-06-01",
    time: "10:30", // "10:30 AM" converted to 24-hour format if needed
    location: "Acme HQ, Building 3",
    ww: "",
  
    // Customer Actual/Setup
    requirement: "Modernize assembly line control systems",
    requirementCategory: "Reduce downtime by 30%, increase efficiency",
    deadline: "2023-08-30",
    customerMachine: "Conveyor Belt System",
    customerMachineProcess: "Assembly Line",
    productApplication: "Industrial Automation",
    customerIssues: "Frequent breakdowns, high maintenance cost",
    existingSetupItems: "Using outdated motor controllers with frequent failures",
    customerSuggestedSetup: "MC-5500 Pro",
    remarks: "Customer requires training for maintenance staff. Installation to be done during scheduled maintenance window.",
  
    actualPicture: null,
    draftDesignLayout: null,
    createdAt: "2023-06-01T10:30:00.000Z",
    updatedAt: "2023-06-01T10:30:00.000Z"
  },
  {
    id: 2,
    slNumber: "FSL-2025-0002",
    salesStage: "Quotation",
    endUser: "TechSolutions Inc.",
    designation: "Facility Manager",
    department: "Operations",
    immediateSupport: "Sarah Williams",
    contactNo: "987-654-3210",
    emailAddress: "s.williams@techsolutions.com",
  
    // Application Details
    category: "Upgrade",
    application: "Building Automation",
    machine: "HVAC Control System",
    machineProcess: "Climate Control",
    neededProduct: "Building Management System",
    existingSpecifications: "Legacy system, 10+ years old",
    issuesWithExisting: "Energy inefficiency, poor temperature control",
    consideration: "Energy savings, remote monitoring capability",
  
    // Support and Quotation
    supportNeeded: "Full system design and implementation",
    urgency: "Medium - Planning phase",
    modelToQuote: "BMS-2000",
    quantity: 1,
    quantityAttention: "Facility Manager",
    qrCc: "procurement@techsolutions.com",
    qrEmailTo: "s.williams@techsolutions.com, procurement@techsolutions.com",
    nextFollowupDate: "2023-06-20",
    dueDate: null,
    doneDate: null,
  
    // Field Sales Lead Details
    account: "TechSolutions Inc.",
    industry: "Building Automation",
    seId: 2, // Map "Emily Chen" to the correct user ID in your users mock
    salesPlanRep: "",
    fslRef: "PO-2023-0789",
    date: "2023-06-05",
    time: "14:00", // "2:00 PM" in 24-hour format
    location: "TechSolutions Campus",
    ww: "",
  
    // Customer Actual/Setup
    requirement: "Smart building management system",
    requirementCategory: "Reduce energy consumption by 25%",
    deadline: "2023-10-15",
    customerMachine: "HVAC Control System",
    customerMachineProcess: "Climate Control",
    productApplication: "Building Automation",
    customerIssues: "Energy inefficiency, poor temperature control",
    existingSetupItems: "Outdated control panels with minimal automation",
    customerSuggestedSetup: "BMS-2500 Enterprise",
    remarks: "Customer interested in phased implementation. First phase to cover main building, followed by annexes.",
  
    actualPicture: null,
    draftDesignLayout: null,
    createdAt: "2023-06-05T14:00:00.000Z",
    updatedAt: "2023-06-05T14:00:00.000Z"
  },
  {
    id: 3,
    slNumber: "FSL-2025-0003",
    salesStage: "Technical",
    endUser: "MediPharm Labs",
    designation: "Process Engineer",
    department: "R&D",
    immediateSupport: "Robert Lee",
    contactNo: "555-123-4567",
    emailAddress: "r.lee@medipharm.com",

    // Application Details
    category: "New Installation",
    application: "Pharmaceutical Processing",
    machine: "Mixing Equipment",
    machineProcess: "Chemical Mixing",
    neededProduct: "Precision Mixer Controller",
    existingSpecifications: "N/A - New installation",
    issuesWithExisting: "Inconsistent mixing results, quality concerns",
    consideration: "FDA compliance, validation requirements",

    // Support and Quotation
    supportNeeded: "Validation documentation, training",
    urgency: "High - New product launch dependent",
    modelToQuote: "PMC-800 Pharma",
    quantity: 3,
    quantityAttention: "Procurement Director",
    qrCc: "quality@medipharm.com",
    qrEmailTo: "r.lee@medipharm.com, procurement@medipharm.com, quality@medipharm.com",
    nextFollowupDate: "2023-06-10",
    dueDate: null,
    doneDate: null,

    // Field Sales Lead Details
    account: "MediPharm Labs",
    industry: "Pharmaceutical",
    seId: 3, // Map "David Wong" to the correct user ID in your users mock
    salesPlanRep: "",
    fslRef: "PO-2023-0567",
    date: "2023-06-03",
    time: "09:00", // "9:00 AM" in 24-hour format
    location: "MediPharm Facility",
    ww: "",

    // Customer Actual/Setup
    requirement: "Automated precision mixing system",
    requirementCategory: "Achieve consistent mixing quality, reduce manual intervention",
    deadline: "2023-07-30",
    customerMachine: "Mixing Equipment",
    customerMachineProcess: "Chemical Mixing",
    productApplication: "Pharmaceutical Processing",
    customerIssues: "Inconsistent mixing results, quality concerns",
    existingSetupItems: "Manual process currently in use",
    customerSuggestedSetup: "PMC-850 Pharma Plus",
    remarks: "Customer requires IQ/OQ/PQ documentation. System must integrate with existing LIMS.",

    actualPicture: null,
    draftDesignLayout: null,
    createdAt: "2023-06-03T09:00:00.000Z",
    updatedAt: "2023-06-03T09:00:00.000Z"
  },
  {
    id: 4,
    slNumber: "FSL-2025-0004",
    salesStage: "RFQ",
    endUser: "GreenEnergy Solutions",
    designation: "Chief Engineer",
    department: "Engineering",
    immediateSupport: "Lisa Martinez",
    contactNo: "333-444-5555",
    emailAddress: "l.martinez@greenenergy.com",

    // Application Details
    category: "Replacement, Upgrade",
    application: "Renewable Energy",
    machine: "Solar Inverter System",
    machineProcess: "Power Conversion",
    neededProduct: "Grid-Tie Inverters",
    existingSpecifications: "10kW, single-phase output",
    issuesWithExisting: "Efficiency loss, compatibility with new panels",
    consideration: "Increased capacity, smart grid features",

    // Support and Quotation
    supportNeeded: "System sizing, installation consultation",
    urgency: "Medium - Scheduled upgrade",
    modelToQuote: "GTI-15000",
    quantity: 5,
    quantityAttention: "Project Manager",
    qrCc: "projects@greenenergy.com",
    qrEmailTo: "l.martinez@greenenergy.com, projects@greenenergy.com",
    nextFollowupDate: "2023-06-25",
    dueDate: null,
    doneDate: null,

    // Field Sales Lead Details
    account: "GreenEnergy Solutions",
    industry: "Renewable Energy",
    seId: 4, // Map "Thomas Brown" to the correct user ID in your users mock
    salesPlanRep: "",
    fslRef: "PO-2023-0890",
    date: "2023-06-08",
    time: "13:30", // "1:30 PM" in 24-hour format
    location: "Solar Farm Site",
    ww: "",

    // Customer Actual/Setup
    requirement: "Modernized solar power conversion system",
    requirementCategory: "Increase conversion efficiency, enable smart grid integration",
    deadline: "2023-09-15",
    customerMachine: "Solar Inverter System",
    customerMachineProcess: "Power Conversion",
    productApplication: "Renewable Energy",
    customerIssues: "Efficiency loss, compatibility with new panels",
    existingSetupItems: "Aging inverters with decreasing efficiency",
    customerSuggestedSetup: "GTI-20000 Smart",
    remarks: "Customer interested in performance guarantee and extended warranty options. Site has limited access requiring special installation considerations.",

    actualPicture: null,
    draftDesignLayout: null,
    createdAt: "2023-06-08T13:30:00.000Z",
    updatedAt: "2023-06-08T13:30:00.000Z"
  }
];