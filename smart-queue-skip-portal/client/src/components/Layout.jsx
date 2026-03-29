import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Layout = ({ title, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main key={location.pathname} className="page-content page-transition">
        <Navbar
          title={title}
          user={user}
          showMenuButton={Boolean(user)}
          onMenuToggle={() => setSidebarOpen((current) => !current)}
        />
        <header className="page-header animated-slide-up">
          <div>
            <h1>{title}</h1>
            {user && (
              <p>
                Signed in as <strong>{user.name}</strong> ({user.role})
              </p>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default Layout;
