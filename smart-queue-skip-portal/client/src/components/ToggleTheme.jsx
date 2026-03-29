import { useTheme } from "../context/ThemeContext";

const ToggleTheme = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
};

export default ToggleTheme;
