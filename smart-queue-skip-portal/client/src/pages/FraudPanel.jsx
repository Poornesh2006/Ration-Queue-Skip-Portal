import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { adminService } from "../services/adminService";

const FraudPanel = () => {
  const [fraudData, setFraudData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFraudData = async () => {
      try {
        const data = await adminService.getFraudCases();
        setFraudData(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load fraud insights");
      } finally {
        setLoading(false);
      }
    };

    loadFraudData();
  }, []);

  return (
    <Layout title="Fraud Panel">
      {loading && <LoadingSpinner label="Loading explainable AI insights..." />}
      {error && <p className="error-text">{error}</p>}

      {fraudData && (
        <>
          <section className="panel-card">
            <h2>Flagged beneficiaries</h2>
            <div className="list-grid">
              {fraudData.fraudCases
                .filter((entry) => entry.entityType === "user" && entry.user)
                .map((entry) => (
                  <article key={entry._id} className="list-card">
                    <h3>{entry.user.name}</h3>
                    <p>{entry.user.rationCardNumber}</p>
                    <p>Fraud score: {entry.score}</p>
                    <p>Status: {entry.status}</p>
                    {entry.explainability?.map((reason) => (
                      <p key={reason.label}>
                        {reason.label} ({reason.impact})
                      </p>
                    ))}
                  </article>
                ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>Dealer risk panel</h2>
            <div className="list-grid">
              {fraudData.fraudCases
                ?.filter((entry) => entry.entityType === "shop" && entry.shop)
                .map((dealer) => (
                  <article key={dealer._id} className="list-card warning-card">
                    <h3>{dealer.shop.shopName}</h3>
                    <p>{dealer.shop.dealerName || "Dealer name unavailable"}</p>
                    <p>Dealer risk score: {dealer.score}</p>
                    <p>Status: {dealer.status}</p>
                    <p>{dealer.reasons.join(", ")}</p>
                  </article>
                ))}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
};

export default FraudPanel;
