import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Loader from "./components/Loader";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminHistory = lazy(() => import("./pages/AdminHistory"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminScanner = lazy(() => import("./pages/AdminScanner"));
const Booking = lazy(() => import("./pages/Booking"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FraudPanel = lazy(() => import("./pages/FraudPanel"));
const History = lazy(() => import("./pages/History"));
const Login = lazy(() => import("./pages/Login"));
const Payment = lazy(() => import("./pages/Payment"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Dashboard />;
};

const NotFoundPage = () => (
  <Layout title="Page Not Found">
    <section className="panel-card">
      <p>The page you requested does not exist.</p>
    </section>
  </Layout>
);

const App = () => (
  <Suspense fallback={<Loader label="Loading page..." />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/slots"
        element={
          <ProtectedRoute roles={["user", "shop_owner", "admin"]}>
            <Booking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute roles={["user", "shop_owner", "admin"]}>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute roles={["user", "shop_owner", "admin"]}>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/history"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute roles={["admin"]}>
            <ProductManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/scanner"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminScanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fraud-panel"
        element={
          <ProtectedRoute roles={["admin"]}>
            <FraudPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);

export default App;
