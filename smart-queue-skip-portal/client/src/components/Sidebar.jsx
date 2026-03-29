import { NavLink } from "react-router-dom";
import Button from "./Button";

const Sidebar = ({ user, onLogout, open = false, onClose }) => {
  const adminLinks = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/history", label: "History" },
    { to: "/admin/analytics", label: "Analytics" },
    { to: "/admin/scanner", label: "Scanner" },
  ];

  const citizenLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/slots", label: "Book Slot" },
    { to: "/history", label: "History" },
  ];

  const links = user?.role === "admin" ? adminLinks : citizenLinks;

  return (
    <>
      <aside className={`sidebar glass-panel animated-fade ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand-group">
          <img
            src="/images/misc/TamilNadu_Logo.svg.png"
            alt="Tamil Nadu emblem"
            className="sidebar-logo"
          />
          <div>
            <p className="brand">Smart Queue Skip Portal</p>
            <p className="brand-subtitle">
              Digital ration slot booking and transparency system
            </p>
          </div>
        </div>

        <nav className="nav-list">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={onClose}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <Button variant="ghost" type="button" onClick={onLogout}>
            Logout
          </Button>
        )}
      </aside>
      {open && <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close sidebar" />}
    </>
  );
};

export default Sidebar;
