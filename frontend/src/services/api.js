// services/api.js
const apiUrl = import.meta.env.VITE_API_URL;

export async function apiBackendFetch(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  console.log(`[api] ${method} ${apiUrl}${endpoint}`);
  if (options.body) {
    try {
      const parsed = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      console.log('[api] body:', parsed);
    } catch {
      console.log('[api] body (unparsed):', options.body);
    }
  } else {
    // log options without circular refs
    console.log('[api] options:', { ...options, body: undefined });
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