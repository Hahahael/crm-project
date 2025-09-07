// src/pages/DashboardPage.jsx
import { useNavigate } from "react-router-dom";

export default function DashboardPage({ setToken }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null); // ✅ update App’s state
    navigate("/login");
  };

  return (
    <div className="p-8 align-middle justify-center flex flex-col">
      <h1 className="text-center">Dashboard (Protected)</h1>
      <button className="w-full rounded-md bg-red-600 py-2 text-white hover:bg-red-500 transition-all ease-in duration-200" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
