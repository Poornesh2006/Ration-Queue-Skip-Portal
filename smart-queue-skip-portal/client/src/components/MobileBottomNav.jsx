import { NavLink } from "react-router-dom";

const MobileBottomNav = ({ user }) => {
  if (!user) {
    return null;
  }

  const links =
    user.role === "admin"
      ? [
          { to: "/admin/dashboard", label: "Home", icon: "HM" },
          { to: "/admin/products", label: "Products", icon: "BX" },
          { to: "/admin/users", label: "Users", icon: "US" },
          { to: "/admin/scanner", label: "Scan", icon: "QR" },
        ]
      : [
          { to: "/", label: "Home", icon: "HM" },
          { to: "/slots", label: "Book", icon: "SL" },
          { to: "/history", label: "History", icon: "HS" },
          { to: "/payment", label: "Pay", icon: "UP" },
        ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} className="mobile-bottom-link">
          <span className="mobile-bottom-icon" aria-hidden="true">
            {link.icon}
          </span>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
