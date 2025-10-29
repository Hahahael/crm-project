// services/api.js
const getApiUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on current location
  const isDevelopment = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';
    
  return isDevelopment 
    ? 'http://localhost:5050' 
    : 'http://139.135.131.164:5500';
};

const apiUrl = getApiUrl();

// Log the API URL being used (helpful for debugging)
console.log(`🌐 API URL: ${apiUrl} (env: ${import.meta.env.MODE})`);

export async function apiBackendFetch(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  console.log(`[api] ${method} ${apiUrl}${endpoint}`);
  if (options.body) {
    try {
      const parsed =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body;
      console.log("[api] body:", parsed);
    } catch {
      console.log("[api] body (unparsed):", options.body);
    }
  } else {
    // log options without circular refs
    console.log("[api] options:", { ...options, body: undefined });
  }
  try {
    const res = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      credentials: "include", // ✅ send cookies with every request
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      // Session expired or unauthorized
      console.warn("❌ Unauthorized: Redirecting to login...");
      window.location.href = "/login"; // or use router push if SPA
      return;
    }

    return res;
  } catch (err) {
    console.error("❌ API fetch error:", err);
    throw err;
  }
}
