import { Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import ToggleTheme from "./ToggleTheme";

const Navbar = ({ title, user, onMenuToggle, showMenuButton = false }) => (
  <header className="topbar glass-panel animated-fade">
    <div className="topbar-brand">
      {showMenuButton && (
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>
      )}
      <img
        src="/images/misc/TamilNadu_Logo.svg.png"
        alt="Tamil Nadu emblem"
        className="topbar-logo"
      />
      <div>
        <Link to="/" className="topbar-title">
          Smart Queue Skip Portal
        </Link>
        <p className="topbar-subtitle">{title}</p>
      </div>
    </div>

    <div className="topbar-actions">
      <LanguageSwitcher />
      <ToggleTheme />
      {user && (
        <div className="admin-profile-chip">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
      )}
    </div>
  </header>
);

export default Navbar;
