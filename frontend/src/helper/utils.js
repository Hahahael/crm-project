// helper/utils.js
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export function toCamel(row) {
  if (Array.isArray(row)) return row.map(toCamel);
  if (row && typeof row === "object") {
    return Object.keys(row).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      acc[camelKey] = row[key];
      return acc;
    }, {});
  }
  return row;
}

export function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      acc[snakeKey] = obj[key];
      return acc;
    }, {});
  }
  return obj;
}

export function formatDate(dateStr, format = "YYYY-MM-DD HH:mm") {
  if (!dateStr) return null;
  return dayjs(dateStr).format(format);
}

export function parseToTimestamp(dateStr, inputFormat = "MM/DD/YYYY") {
  if (!dateStr) return null;
  return dayjs(dateStr, inputFormat).toDate();
  // JS Date, pg auto-casts to TIMESTAMP
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, "MMMM D, YYYY h:mm A");
}

export function formatDateOnly(dateStr) {
  return formatDate(dateStr, "YYYY-MM-DD");
}

export function formatTimeOnly(timeStr) {
  if (!timeStr) return "-";
  // Tell dayjs the format you expect
  const parsed = dayjs(timeStr, "h:mm:ss");
  return parsed.isValid() ? parsed.format("h:mm A") : "-";
}

export function toArray(val) {
  return Array.isArray(val) ? val : [];
}

export function getVendorStatus(items) {
  if (!Array.isArray(items) || items.length === 0) return "Pending";
  const allHavePriceAndLeadTime = items.every(
    (item) =>
      item.unitPrice &&
      item.leadTime &&
      item.unitPrice !== "" &&
      item.leadTime !== "",
  );
  const someHavePriceOrLeadTime = items.some(
    (item) =>
      item.unitPrice &&
      item.leadTime &&
      item.unitPrice !== "" &&
      item.leadTime !== "",
  );
  if (allHavePriceAndLeadTime) return "Quoted";
  if (someHavePriceOrLeadTime) return "In Progress";
  return "Pending";
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return Number(value).toFixed(decimals);
}

function getCurrencySymbol(code, locale) {
  try {
    return (0).toLocaleString(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/\d/g, "").trim();
  } catch {
    return code;
  }
}

export function formatMoney(value, vendor, options = {}) {
  const {
    currency,           // ISO code now
    locale = "en-PH",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrency = true
  } = options;

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return showCurrency
      ? `${getCurrencySymbol(currency, locale)} 0.00`
      : "0.00";
  }

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  });
  
  const finalCurrency = currency ?? vendor?.currency?.Code ?? "PHP";

  if (!showCurrency) return formatted;

  const symbol = getCurrencySymbol(finalCurrency, locale);
  return `${symbol} ${formatted}`;
}

export function calculateTimeliness(
  dueDate,
  doneDate = null,
  { graceDays = 0 } = {},
) {
  if (!dueDate) return { status: "unknown", daysLate: null };

  const due = dayjs(dueDate);
  if (!due.isValid()) return { status: "unknown", daysLate: null };

  // If task is completed (has doneDate), compare completion date vs due date
  if (doneDate) {
    const done = dayjs(doneDate);
    if (!done.isValid()) return { status: "unknown", daysLate: null };

    // Calculate days late based on completion date vs due date
    const daysLate = Math.max(
      0,
      done.startOf("day").diff(due.startOf("day"), "day"),
    );

    if (done.isAfter(due.add(graceDays, "day"), "day")) {
      // Completed beyond grace period -> was overdue when completed
      return { status: "overdue", daysLate };
    }

    if (daysLate > 0) {
      // Completed late but within grace period
      return { status: "late", daysLate };
    }

    // Completed on time or early
    return { status: "on_time", daysLate: 0 };
  }

  // Task is not completed yet, compare current date vs due date
  const now = dayjs();
  const daysLate = Math.max(
    0,
    now.startOf("day").diff(due.startOf("day"), "day"),
  );

  if (now.isAfter(due.add(graceDays, "day"), "day")) {
    // Currently beyond grace period -> overdue
    return { status: "overdue", daysLate };
  }

  if (daysLate > 0) {
    // Currently late but within grace period
    return { status: "late", daysLate };
  }

  // Currently on time
  return { status: "on_time", daysLate: 0 };
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return `₱${Number(value).toFixed(2)}`;
}

// Config helper functions (using existing config.js)
import config from "../config.js";

export function getBadgeClasses(type, status, fallback = "bg-gray-100 text-gray-700") {
  const badgeConfig = config[`${type}BadgeClasses`];
  if (!badgeConfig) return fallback;
  return badgeConfig[status] || fallback;
}

export function getCompleteBadgeClasses(type, status) {
  const base = config.components.baseBadge;
  const rounded = config.components.badgeRounded;
  const statusClasses = getBadgeClasses(type, status);
  return `${base} ${rounded} ${statusClasses}`;
}

export function getButtonClasses(variant = 'primary', size = 'md', additional = '') {
  const base = config.components.baseButton;
  const sizeClass = config.components.buttonSizes[size];
  const variantClass = config.components.buttonVariants[variant];
  return `${base} ${sizeClass} ${variantClass} ${additional}`.trim();
}

export function getNotificationClasses(type = 'info') {
  const base = config.components.baseNotification;
  const variant = config.components.notificationVariants[type];
  return `${base} ${variant}`;
}

export function calculateVAT(subtotal) {
  return Number(subtotal) * config.business.vatRate;
}

export function calculateGrandTotal(subtotal) {
  return Number(subtotal) + calculateVAT(subtotal);
}

export function validateField(type, value) {
  const pattern = config.business.validation[type];
  if (!pattern) return true; // No validation pattern defined
  return pattern.test(value);
}

export function validateFileUpload(file) {
  if (!file) return { valid: false, error: 'No file selected' };
  
  // Check file size
  if (file.size > config.business.maxFileSize) {
    const maxSizeMB = config.business.maxFileSize / (1024 * 1024);
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (!config.business.allowedFileTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  return { valid: true };
}

export function isGlobalAdmin(user) {
  if (!user) return false;
  console.log("User roles:", user);
  const permissions = Array.isArray(user.permissions) ? user.permissions : [user.permission];
  return permissions.includes("all");
}

export function hasAnyModulePermission(user, module) {
  if (!user) return false;
  console.log("User permissions for has any module permission:", user, "module:", module);

  const permissions = Array.isArray(user.permissions) ? user.permissions : [user.permission];

  // Global admin always has all permissions
  if (permissions.includes("all")) return true;

  return permissions.some(permission =>
    permission.startsWith(`${module}.`) // matches .read, .write, .all
  );
}

export function isModuleAdmin(user, module) {
  if (!user) return false;
  console.log("User permissions:", user);

  const permissions = Array.isArray(user.permissions) ? user.permissions : [user.permission];

  // Global admin counts as module admin
  if (permissions.includes("all")) return true;

  return permissions.includes(`${module}.all`);
}

export function hasEditModulePermission(user, module) {
  if (!user) return false;
  console.log("User permissions for edit module permission:", user, "module:", module);

  const permissions = Array.isArray(user.permissions) ? user.permissions : [user.permission];

  // Global admin always has all permissions
  if (permissions.includes("all")) return true;

  return permissions.includes(`${module}.write`) || permissions.includes(`${module}.all`);
}

// ✅ Default export with all helpers including new ones
export default {
  toCamel,
  toSnake,
  toArray,
  formatDate,
  parseToTimestamp,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  getVendorStatus,
  formatNumber,
  calculateTimeliness,
  formatCurrency,
  // New helper functions
  getBadgeClasses,
  getCompleteBadgeClasses,
  getButtonClasses,
  getNotificationClasses,
  calculateVAT,
  calculateGrandTotal,
  validateField,
  validateFileUpload,
  isGlobalAdmin,
  hasAnyModulePermission,
  isModuleAdmin,
  hasEditModulePermission,
};
