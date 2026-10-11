import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
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

function LoginRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path=":page" element={<RoutedPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
