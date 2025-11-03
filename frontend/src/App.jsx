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
import AccountsPage from "./pages/AccountsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import QuotationsPage from "./pages/QuotationsPage";
import CalendarPage from "./pages/CalendarPage";
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

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
            path="/quotations"
            element={
              <ProtectedRoute>
                <QuotationsPage />
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
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <ApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
