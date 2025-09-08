import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import Layout from "./components/Layout";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); // ✅ reactive

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <LoginPage setToken={setToken} />}
        />

        <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage setToken={setToken} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        /></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
