// helper/utils.js
import dayjs from "dayjs";

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
  // gives a JS Date, which pg will auto-cast to TIMESTAMP
}

// example specialized formatters
export function formatDateTime(dateStr) {
  return formatDate(dateStr, "MMMM D, YYYY h:mm A");
}

export function formatDateOnly(dateStr) {
  return formatDate(dateStr, "YYYY-MM-DD");
}

export function formatTimeOnly(dateStr) {
  return formatDate(dateStr, "HH:mm");
}

export function toJsonbArray(arr) {
  if (!Array.isArray(arr)) return arr; // fallback
  return JSON.stringify(arr); // Postgres driver will handle ::jsonb
}