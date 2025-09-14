// services/api.js
const apiUrl = import.meta.env.VITE_API_URL;

export async function apiBackendFetch(endpoint, options = {}) {
  console.log(endpoint);
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