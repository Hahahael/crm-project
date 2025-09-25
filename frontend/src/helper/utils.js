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
  const parsed = dayjs(timeStr, "HH:mm:ss");
  return parsed.isValid() ? parsed.format("HH:mm A") : "-";
}

// ✅ Default export with all helpers
export default {
  toCamel,
  toSnake,
  formatDate,
  parseToTimestamp,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
};
