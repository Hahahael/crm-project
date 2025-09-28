import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import Layout from "./components/Layout";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import SalesLeadsPage from "./pages/SalesLeadsPage";
import TechnicalsPage from "./pages/TechnicalsPage";
import RFQsPage from "./pages/RFQsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workorders"
            element={
              <ProtectedRoute>
                <WorkOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesleads"
            element={
              <ProtectedRoute>
                <SalesLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technicals"
            element={
              <ProtectedRoute>
                <TechnicalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs"
            element={
              <ProtectedRoute>
                <RFQsPage />
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
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
