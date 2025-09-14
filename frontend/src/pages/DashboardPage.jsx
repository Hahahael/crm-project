import { useEffect, useState } from "react";
import { apiBackendFetch } from "../services/api";

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiBackendFetch("/auth/me");
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      }
    }

    fetchUser();
  }, []);

  return (
    <div className="p-8 align-middle justify-center flex flex-col">
      <h1 className="text-center">Dashboard (Protected)</h1>
      {user && <p className="text-center mt-4">Welcome, {user.username}!</p>}
    </div>
  );
}
