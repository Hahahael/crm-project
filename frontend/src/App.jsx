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
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route element={
          <ProtectedRoute>
            <UserProvider>
              <Layout />
            </UserProvider>
          </ProtectedRoute>
        }>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />
          <Route path="/workorders" element={<WorkOrdersPage />} />
          <Route path="/salesleads" element={<SalesLeadsPage />} />
          <Route path="/technicals" element={<TechnicalsPage />} />
          <Route path="/rfqs" element={<RFQsPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
        </Routes>
    </BrowserRouter>
  );
}

export default App;
