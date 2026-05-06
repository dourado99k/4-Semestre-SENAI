import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { Layout } from "./components/Layout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { RoomsPage } from "./pages/RoomsPage.jsx";
import { GuestsPage } from "./pages/GuestsPage.jsx";
import { ReservationsPage } from "./pages/ReservationsPage.jsx";
import { AlertsPage } from "./pages/AlertsPage.jsx";
import { AuditPage } from "./pages/AuditPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="auth-page muted">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="quartos" element={<RoomsPage />} />
        <Route path="hospedes" element={<GuestsPage />} />
        <Route path="reservas" element={<ReservationsPage />} />
        <Route path="alertas" element={<AlertsPage />} />
        <Route path="historico" element={<AuditPage />} />
        <Route path="config" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
