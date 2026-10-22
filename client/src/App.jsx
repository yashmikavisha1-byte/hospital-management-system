import { HashRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ManagementPage from "./pages/Management";

function RoutedPage() {
  const { page } = useParams();
  return <ManagementPage page={page} />;
}

function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginRoute({ role }) {
  const { user } = useAuth();
  // only redirect when the logged-in user's role matches this login page
  return user && user.role === role ? <Navigate to="/" replace /> : <Login role={role} />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Navigate to="/patient/login" replace />} />
          <Route path="/admin/login" element={<LoginRoute role="admin" />} />
          <Route path="/doctor/login" element={<LoginRoute role="doctor" />} />
          <Route path="/patient/login" element={<LoginRoute role="patient" />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="logbook" element={<Navigate to="/" replace />} />
              <Route path=":page" element={<RoutedPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}