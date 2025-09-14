import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiBackendFetch } from "../services/api";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiBackendFetch("/auth/me");
        if (res.ok) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      } catch (err) {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>; // optional spinner

  if (!authenticated) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
