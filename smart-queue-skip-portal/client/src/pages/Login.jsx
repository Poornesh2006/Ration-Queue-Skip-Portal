import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ToggleTheme from "../components/ToggleTheme";
import { useAuth } from "../context/AuthContext";
import { fileToBase64, getDeviceInfo } from "../utils/deviceInfo";

const FACE_VERIFICATION_ENABLED = import.meta.env.VITE_FACE_VERIFICATION_ENABLED === "true";
const queuePeople = ["queue-1", "queue-2", "queue-3", "queue-4"];

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { verifyUser, verifyFace, sendOtp, verifyOtp, loading } = useAuth();
  const [formData, setFormData] = useState({
    aadhaarNumber: "",
    phoneNumber: "",
    otp: "",
  });
  const [otpStep, setOtpStep] = useState(false);
  const [faceVerified, setFaceVerified] = useState(!FACE_VERIFICATION_ENABLED);
  const [facePreview, setFacePreview] = useState("");
  const [facePayload, setFacePayload] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const deviceInfo = useMemo(() => getDeviceInfo(), []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleFaceChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const base64 = await fileToBase64(file);
    setFacePreview(base64);
    setFacePayload(base64);
    setFaceVerified(false);
  };

  const handleVerifyUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      aadhaar_number: formData.aadhaarNumber,
      phone_number: formData.phoneNumber,
    };

    try {
      const verifyResponse = await verifyUser(payload);
      setMaskedPhone(verifyResponse.user?.masked_phone_number || "");
      setDemoOtp("");

      if (FACE_VERIFICATION_ENABLED) {
        if (!facePayload) {
          setError(t("upload_face_error"));
          return;
        }

        const faceResponse = await verifyFace({
          aadhaar_number: formData.aadhaarNumber,
          image: facePayload,
        });

        if (!faceResponse.match) {
          setError(
            `${t("face_verification_failed")} ${Math.round((faceResponse.score || 0) * 100)}% ${t(
              "below_threshold"
            )} ${Math.round((faceResponse.threshold || 0.7) * 100)}%.`
          );
          return;
        }

        setFaceVerified(true);
      }

      const otpData = await sendOtp(payload);
      setOtpStep(true);
      setDemoOtp(otpData.sms?.demoOtp || "");
      setMessage(
        otpData.sms?.delivered
          ? `${t("user_verified_sent")} ${otpData.masked_phone_number || maskedPhone}.`
          : `${t("user_verified_fallback")} ${otpData.masked_phone_number || maskedPhone}.`
      );
    } catch (requestError) {
      setDemoOtp("");
      setError(
        requestError.response?.data?.message ||
          (requestError.request ? t("backend_unreachable") : t("unable_verify_citizen"))
      );
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await verifyOtp({
        aadhaar_number: formData.aadhaarNumber,
        otp: formData.otp,
        ...deviceInfo,
      });
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("unable_verify_otp"));
    }
  };

  return (
    <div className="citizen-auth-page">
      <div className="citizen-auth-glow" />
      <motion.section
        className="login-story-panel"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="story-kicker">{t("portal_title")}</div>
        <h2 className="story-title">{t("story_heading")}</h2>
        <p className="story-copy">{t("story_subcopy")}</p>

        <div className="story-stage">
          <div className="story-column">
            <span className="story-label">{t("story_old_system")}</span>
            <div className="queue-scene">
              {queuePeople.map((personId, index) => (
                <motion.div
                  key={personId}
                  className="queue-person"
                  animate={{
                    opacity: [1, 1, 0.15, 0.05],
                    x: [0, 0, 24, 34],
                    scale: [1, 1, 0.82, 0.72],
                  }}
                  transition={{
                    duration: 4.4,
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: index * 0.22,
                    ease: "easeInOut",
                  }}
                >
                  <span className="person-avatar-head" />
                  <span className="person-avatar-body" />
                </motion.div>
              ))}
            </div>
            <motion.div
              className="corruption-signal"
              animate={{
                rotate: [0, -8, 8, 0],
                opacity: [1, 0.9, 0.35, 0.18],
                scale: [1, 1.03, 0.88, 0.82],
              }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            >
              !
            </motion.div>
          </div>

          <motion.div
            className="story-arrow"
            animate={{ x: [0, 8, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            -&gt;
          </motion.div>

          <div className="story-column">
            <span className="story-label">{t("story_new_system")}</span>
            <motion.div
              className="clean-scene"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="clean-user">
                <span className="person-avatar-head" />
                <span className="person-avatar-body" />
              </div>
              <motion.div
                className="clean-check"
                animate={{ scale: [0.9, 1.08, 1], opacity: [0.7, 1, 0.9] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="check-mark" />
              </motion.div>
            </motion.div>
            <motion.div
              className="shield-scene"
              animate={{ scale: [0.94, 1.04, 1], opacity: [0.75, 1, 0.88] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span>Shield</span>
            </motion.div>
          </div>
        </div>

        <p className="story-tagline">{t("story_tagline")}</p>
      </motion.section>

      <motion.section
        className="citizen-auth-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="auth-utility-bar">
          <LanguageSwitcher />
          <ToggleTheme />
        </div>
        <img
          src="/images/misc/TamilNadu_Logo.svg.png"
          alt="Tamil Nadu logo"
          className="portal-logo"
        />
        <p className="eyebrow">{t("portal_title")}</p>
        <h1>{t("citizen_login")}</h1>
        <p className="hero-copy compact-copy">{t("citizen_login_short")}</p>
        <p className="helper-text auth-helper-line">{t("citizen_login_secure")}</p>

        {demoOtp && (
          <div className="recommendation-card">
            <strong>{t("demo_otp")}:</strong> {demoOtp}
          </div>
        )}

        <form className="form-grid" onSubmit={otpStep ? handleVerifyOtp : handleVerifyUser}>
          <label>
            {t("aadhaar_number")}
            <input
              name="aadhaarNumber"
              value={formData.aadhaarNumber}
              onChange={handleChange}
              placeholder={t("aadhaar_placeholder")}
              inputMode="numeric"
              maxLength={12}
              required
            />
          </label>

          <label>
            {t("phone_number")}
            <input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder={t("phone_placeholder")}
              inputMode="numeric"
              maxLength={10}
              required
            />
          </label>

          {FACE_VERIFICATION_ENABLED && !otpStep && (
            <>
              <label>
                {t("face_image")}
                <input type="file" accept="image/*" onChange={handleFaceChange} />
              </label>
              {facePreview && (
                <div className="qr-card">
                  <img src={facePreview} alt="Face preview" className="face-preview" />
                  <p>{faceVerified ? t("face_verified") : t("face_ready")}</p>
                </div>
              )}
            </>
          )}

          {otpStep && (
            <label>
              {t("otp")}
              <input
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder={t("otp_placeholder")}
                inputMode="numeric"
                maxLength={6}
                required
              />
            </label>
          )}

          {!otpStep && maskedPhone && (
            <p className="helper-text">
              {t("otp_will_be_sent")} {maskedPhone}
            </p>
          )}

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? otpStep
                ? t("verifying_otp")
                : FACE_VERIFICATION_ENABLED
                ? t("checking_details")
                : t("verifying_user")
              : otpStep
                ? t("verify_otp")
                : t("verify_user")}
          </button>

          {otpStep && (
            <button
              className="ghost-button"
              type="button"
              disabled={loading}
              onClick={handleVerifyUser}
            >
              {t("resend_otp")}
            </button>
          )}
        </form>

        <p className="helper-text">
          {t("admin_access")} <Link to="/admin/login">{t("open_admin_login")}</Link>
        </p>
      </motion.section>
    </div>
  );
};

export default Login;
