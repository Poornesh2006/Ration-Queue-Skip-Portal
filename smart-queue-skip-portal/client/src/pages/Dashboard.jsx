import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await authService.getCurrentUser();
        setProfile(data.user);
      } catch {
        setProfile(user);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  return (
    <Layout title={t("citizen_dashboard")}>
      <section className="legacy-hero dashboard-shell">
        <img
          src="/images/misc/TamilNadu_Logo.svg.png"
          alt="Tamil Nadu logo"
          className="portal-logo"
        />
        <h2>{t("dashboard_welcome")}</h2>

        <Card className="legacy-profile animated-slide-up">
          {loading ? (
            <>
              <Skeleton className="legacy-profile-pic skeleton-avatar" rounded />
              <div className="legacy-profile-details">
                <Skeleton className="skeleton-line skeleton-line-wide" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line skeleton-line-short" />
              </div>
            </>
          ) : profile ? (
            <>
              <img
                src={profile?.profileImage || "/images/misc/user1.png"}
                alt={profile?.name || "Citizen"}
                className="legacy-profile-pic"
              />
              <div className="legacy-profile-details">
                <p>
                  <strong>{t("name_label")}:</strong> {profile?.name}
                </p>
                <p>
                  <strong>{t("aadhaar_label")}:</strong> {profile?.aadhaarNumber || t("not_linked")}
                </p>
                <p>
                  <strong>{t("card_type")}:</strong> {profile?.cardType}
                </p>
                <p>
                  <strong>{t("city")}:</strong> {profile?.city || "Not available"}
                </p>
                <p>
                  <strong>{t("village")}:</strong> {profile?.village || profile?.city || "Not available"}
                </p>
                <p>
                  <strong>{t("pincode")}:</strong> {profile?.pincode || "N/A"}
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              title="No data available"
              description="Citizen profile details are not available right now."
              icon="user"
            />
          )}
        </Card>

        <div className="stats-grid dashboard-metrics">
          {(loading ? Array.from({ length: 4 }) : Array.from({ length: 4 })).map((_, index) => (
            <article key={`metric-${index}`} className="metric-card animated-slide-up">
              {loading ? (
                <>
                  <Skeleton className="skeleton-metric-value" />
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line" />
                </>
              ) : index === 0 ? (
                <>
                  <strong>{profile?.familyMembers}</strong>
                  <span>{t("family_members")}</span>
                  <small>{t("family_members_copy")}</small>
                </>
              ) : index === 1 ? (
                <>
                  <strong>{profile?.priorityCategory}</strong>
                  <span>{t("priority_category")}</span>
                  <small>{t("priority_category_copy")}</small>
                </>
              ) : index === 2 ? (
                <>
                  <strong>{profile?.role}</strong>
                  <span>{t("account_role")}</span>
                  <small>{t("account_role_copy")}</small>
                </>
              ) : (
                <>
                  <strong>{profile?.entitlement?.riceKg || 0} Kg</strong>
                  <span>{t("rice_entitlement")}</span>
                  <small>{t("rice_entitlement_copy")}</small>
                </>
              )}
            </article>
          ))}
        </div>

        <Card className="nested-panel">
          <h2>{t("family_entitlement_calculator")}</h2>
          <div className="list-grid compact-grid">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <article key={`entitlement-skeleton-${index}`} className="list-card">
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line" />
                </article>
              ))
            ) : (
              <>
                <article className="list-card">
                  <strong>{t("rice")}</strong>
                  <p>{profile?.entitlement?.riceKg || 0} Kg</p>
                </article>
                <article className="list-card">
                  <strong>{t("wheat")}</strong>
                  <p>{profile?.entitlement?.wheatKg || 0} Kg</p>
                </article>
                <article className="list-card">
                  <strong>{t("sugar")}</strong>
                  <p>{profile?.entitlement?.sugarKg || 0} Kg</p>
                </article>
                <article className="list-card">
                  <strong>{t("kerosene")}</strong>
                  <p>{profile?.entitlement?.keroseneLitres || 0} L</p>
                </article>
              </>
            )}
          </div>
        </Card>

        <div className="inline-actions hero-actions">
          <Link className="ui-button ui-button-primary" to="/slots">
            <span>{t("view_products_book_slot")}</span>
          </Link>
          <Link className="ui-button ui-button-ghost" to="/history">
            <span>{t("purchase_history")}</span>
          </Link>
          <Link className="ui-button ui-button-ghost" to="/payment">
            <span>{t("payment")}</span>
          </Link>
        </div>

        <div className="dashboard-feature-grid">
          <Card className="feature-card">
            <span className="feature-icon">QB</span>
            <h3>{t("quick_booking")}</h3>
            <p>{t("quick_booking_copy")}</p>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon">TA</span>
            <h3>{t("transparent_access")}</h3>
            <p>{t("transparent_access_copy")}</p>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon">SL</span>
            <h3>{t("secure_login")}</h3>
            <p>{t("secure_login_copy")}</p>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
