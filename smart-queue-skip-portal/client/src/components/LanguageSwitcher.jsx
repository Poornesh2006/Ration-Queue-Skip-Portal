import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="language-switcher" aria-label="Language switcher">
      <button
        type="button"
        className={`language-pill ${i18n.language === "en" ? "active" : ""}`}
        onClick={() => i18n.changeLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`language-pill ${i18n.language === "ta" ? "active" : ""}`}
        onClick={() => i18n.changeLanguage("ta")}
      >
        தமிழ்
      </button>
    </div>
  );
};

export default LanguageSwitcher;
