import util from "node:util";

// Global console.error colorizer (red) with caller path
// Loads early in server bootstrap to wrap console.error with ANSI colors and annotate with file:line:col.
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

const originalError = console.error.bind(console);

function getCallerLocation() {
  try {
    const err = new Error();
    const stack = (err.stack || "").split("\n").slice(1);
    const ignoreHints = [
      "helper/logColors.js",
      "node:internal",
      "internal/",
      "(node:",
    ];
    for (const line of stack) {
      if (ignoreHints.some((h) => line.includes(h))) continue;
      // Patterns: at Function (path:line:col) OR at path:line:col
      const m1 = line.match(/\((.*):(\d+):(\d+)\)/);
      const m2 = !m1 && line.match(/at (.*):(\d+):(\d+)/);
      const m = m1 || m2;
      if (m) {
        const file = m[1];
        const ln = m[2];
        const col = m[3];
        const cwd = process.cwd ? process.cwd() : "";
        const rel = file.startsWith(cwd) ? file.slice(cwd.length + 1) : file;
        return `${rel}:${ln}:${col}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

console.error = (...args) => {
  try {
    const loc = getCallerLocation();
    const prefix = loc ? `[${loc}] ` : "";
    // If a single Error object, print its stack/message in red cleanly
    if (args.length === 1 && args[0] instanceof Error) {
      const err = args[0];
      const text = err.stack || err.message || String(err);
      originalError(`${RED}${prefix}${text}${RESET}`);
      return;
    }
    // Otherwise, format the message consistently and colorize
    const msg = util.format(...args);
    originalError(`${RED}${prefix}${msg}${RESET}`);
  } catch {
    // Fallback to original if anything goes wrong
    originalError(...args);
  }
};
