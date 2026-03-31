import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookingSuccessState from "../components/BookingSuccessState";
import ProductCard from "../components/booking/ProductCard";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { bookingService } from "../services/bookingService";
import { grievanceService } from "../services/grievanceService";
import { shopService } from "../services/shopService";
import { slotService } from "../services/slotService";
import { offlineQueue } from "../utils/offlineQueue";
import { orderStorage } from "../utils/orderStorage";
import { productCatalog } from "../utils/productCatalog";

const getInitialQuantities = (products) =>
  products.reduce((accumulator, product) => {
    accumulator[product.id] = 0;
    return accumulator;
  }, {});

const getDateKey = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const deriveAvailableDates = (slots = []) =>
  Object.values(
    slots.reduce((accumulator, slot) => {
      const sourceDate = getDateKey(slot.dateKey || slot.effectiveDate || slot.slotDate || slot.date);

      if (!sourceDate) {
        return accumulator;
      }

      if (!accumulator[sourceDate]) {
        accumulator[sourceDate] = {
          date: sourceDate,
          availableSlotsCount: 0,
          badge: "Available",
        };
      }

      if ((slot.remaining ?? 1) > 0) {
        accumulator[sourceDate].availableSlotsCount += 1;
      }

      return accumulator;
    }, {})
  ).sort((left, right) => left.date.localeCompare(right.date));

const buildFallbackEntitlement = (user) => {
  const members = Math.max(1, Number(user?.familyMembers) || 1);
  const cardType = String(user?.cardType || "NPHH").toUpperCase();
  const isAay = cardType === "AAY" || cardType === "PHH-AAY";
  const rice = isAay ? 35 : members === 1 ? 12 : members === 2 ? 16 : members * 5;
  const sugar = Math.min(2, members * 0.5);
  const wheat = isAay ? 0 : 10;
  const oil = isAay ? 2 : 1;
  const dal = isAay ? 2 : 1;
  const salt = 1;
  const kerosene = isAay ? 3 : members <= 2 ? 1 : 2;

  return {
    rice,
    sugar,
    wheat,
    oil,
    dal,
    salt,
    kerosene,
    riceKg: rice,
    sugarKg: sugar,
    wheatKg: wheat,
    oilLitres: oil,
    dalKg: dal,
    saltKg: salt,
    keroseneLitres: kerosene,
  };
};

const Booking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState(user);
  const [shops, setShops] = useState([]);
  const [slots, setSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [date, setDate] = useState("");
  const [shopId, setShopId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedProducts, setSelectedProducts] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingQrCode, setBookingQrCode] = useState("");
  const [shopRecommendation, setShopRecommendation] = useState(null);
  const [offlineMessage, setOfflineMessage] = useState("");
  const [successRedirectTarget, setSuccessRedirectTarget] = useState("");
  const [grievanceForm, setGrievanceForm] = useState({
    category: "delay",
    description: "",
    proofUrl: "",
  });

  const speakConfirmation = (slotLabel) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const tamilLanguage = localStorage.getItem("smart-queue-language") === "ta";
    const messageToSpeak = tamilLanguage
      ? "உங்கள் பதிவு வெற்றிகரமாக முடிந்தது. தேர்ந்தெடுத்த தேதியில் உங்கள் ரேஷனை பெறுங்கள்."
      : `Your booking is confirmed. Please collect your ration on ${slotLabel || "the selected date"}.`;

    const utterance = new SpeechSynthesisUtterance(messageToSpeak);
    utterance.lang = tamilLanguage ? "ta-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      try {
        const data = await authService.getCurrentUser();

        if (!ignore) {
          setProfileUser(data.user || user);
        }
      } catch {
        if (!ignore) {
          setProfileUser(user);
        }
      }
    };

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [user]);

  const activeUser = profileUser || user;
  const entitlement = activeUser?.entitlement || buildFallbackEntitlement(activeUser);
  const products = useMemo(
    () =>
      (productCatalog[activeUser?.cardType] || productCatalog.NPHH)
        .map((product) => {
          const entitlementLimit =
            product.id === "rice"
              ? entitlement.riceKg || entitlement.rice || 0
              : product.id === "sugar"
                ? entitlement.sugarKg || entitlement.sugar || 0
                : product.id === "wheat"
                  ? entitlement.wheatKg || entitlement.wheat || 0
                  : product.id === "oil"
                    ? entitlement.oilLitres || entitlement.oil || 0
                    : product.id === "dhal"
                      ? entitlement.dalKg || entitlement.dal || 0
                      : product.id === "salt"
                        ? entitlement.saltKg || entitlement.salt || 0
                      : product.id === "kerosene"
                        ? entitlement.keroseneLitres || entitlement.kerosene || 0
                        : 0;

          return {
            ...product,
            maxQuantity: Number(entitlementLimit) || 0,
          };
        })
        .filter((product) => product.maxQuantity > 0),
    [activeUser?.cardType, entitlement]
  );

  useEffect(() => {
    setSelectedProducts(getInitialQuantities(products));
  }, [products]);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop._id === shopId) || null,
    [shopId, shops]
  );
  const nextAvailableDate = useMemo(
    () => availableDates.find((entry) => entry.date !== date)?.date || availableDates[0]?.date || "",
    [availableDates, date]
  );

  const selectableSlots = useMemo(
    () => slots.filter((slot) => slot.remaining > 0 && slot.priorityEligible),
    [slots]
  );
  const freeProducts = products.filter((product) => product.type === "free");
  const paidProducts = products.filter((product) => product.type === "paid");

  const getAvailableStock = (productId) => {
    const stockValue = selectedShop?.stock?.[productId];
    if (typeof stockValue === "number") {
      return Math.max(0, stockValue);
    }

    return 20;
  };

  const orderSummary = useMemo(() => {
    const items = products.map((product) => ({
      ...product,
      quantity: selectedProducts[product.id] || 0,
      stock: getAvailableStock(product.id),
    }));

    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const gst = subtotal * 0.05;

    return {
      items,
      subtotal,
      gst,
      total: subtotal + gst,
    };
  }, [products, selectedProducts, selectedShop]);

  const getMaxAllowedQuantity = (productId) => {
    const product = products.find((entry) => entry.id === productId);
    const maxStock = getAvailableStock(productId);
    const allowedQty = Math.max(0, Number(product?.maxQuantity) || 0);
    return Math.max(0, Math.min(maxStock, allowedQty));
  };

  useEffect(() => {
    const loadShops = async () => {
      try {
        const data = await shopService.getShops();
        setShops(data.shops);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load shops");
      }
    };

    loadShops();
  }, []);

  useEffect(() => {
    const loadAvailableDates = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await slotService.getSlots();
        const nextDates = data.availableDates?.length
          ? data.availableDates
          : deriveAvailableDates(data.slots || []);

        setAvailableDates(nextDates);

        if (!date && nextDates.length) {
          setDate(nextDates[0].date);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load available dates");
      } finally {
        setLoading(false);
      }
    };

    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setRecommendation(null);
      setShopRecommendation(null);
      return;
    }

    const loadSlots = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await slotService.getSlots(date);
        setSlots(data.slots || []);
        setRecommendation(data.recommendation);
        setShopRecommendation(data.shopRecommendation);
        const nextDates = data.availableDates?.length
          ? data.availableDates
          : deriveAvailableDates(data.slots || []);

        setAvailableDates(nextDates);

        if (date && nextDates.length && !nextDates.some((entry) => entry.date === date)) {
          setDate(nextDates[0].date);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load slots");
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [date]);

  useEffect(() => {
    setSelectedSlot("");
  }, [date, shopId]);

  useEffect(() => {
    if (!message || !successRedirectTarget) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(successRedirectTarget);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [message, navigate, successRedirectTarget]);

  const handleQuantityChange = (productId, nextQuantity) => {
    const product = products.find((entry) => entry.id === productId);
    const maxAllowed = getMaxAllowedQuantity(productId);
    const selectedQty = Math.max(0, Number(nextQuantity) || 0);

    if (import.meta.env.DEV) {
      console.info("Allowed:", maxAllowed);
      console.info("Selected:", selectedQty);
    }

    if (selectedQty > maxAllowed) {
      setError(`Limit exceeded for ${product?.name || "this item"}. Allowed quantity is ${maxAllowed}.`);
      setSelectedProducts((current) => ({
        ...current,
        [productId]: maxAllowed,
      }));
      return;
    }

    setError("");
    setSelectedProducts((current) => ({
      ...current,
      [productId]: selectedQty,
    }));
  };

  useEffect(() => {
    if (!error || (!error.includes("entitlement") && !error.includes("Limit exceeded"))) {
      return;
    }

    const hasInvalidSelection = products.some((product) => {
      const selectedQty = selectedProducts[product.id] || 0;
      return selectedQty > getMaxAllowedQuantity(product.id);
    });

    if (!hasInvalidSelection) {
      setError("");
    }
  }, [error, products, selectedProducts, selectedShop]);

  const handleBooking = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBookingQrCode("");
    setOfflineMessage("");

    if (!shopId) {
      setError("Select a shop before booking.");
      return;
    }

    if (!selectedSlot) {
      setError("Select an available slot to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const requestedItems = orderSummary.items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          item: item.id === "dhal" ? "dal" : item.id,
          quantity: item.quantity,
        }));

      if (!requestedItems.length) {
        setError("Select at least one entitled ration item before booking.");
        return;
      }

      const bookingPayload = {
        shopId,
        slotId: selectedSlot,
        date,
        items: requestedItems,
      };

      if (!navigator.onLine) {
        offlineQueue.add({
          type: "booking",
          payload: bookingPayload,
        });
        setOfflineMessage(
          "You are offline. Booking request saved locally and will sync when internet returns."
        );
        return;
      }

      const data = await bookingService.createBooking(bookingPayload);

      const selectedSlotDetails = slots.find((slot) => slot._id === selectedSlot);

      orderStorage.setOrder({
        ...orderSummary,
        date,
        shopName: selectedShop?.shopName || "",
        slotTime: selectedSlotDetails?.slotTime || "",
        notification: data.notification,
        qrCodeDataUrl: data.qrCodeDataUrl,
        entitlement: data.entitlement || entitlement,
        bookingId: data.booking?._id,
        freeItems: data.freeItems || [],
        paidItems: data.paidItems || [],
        totalAmount: data.totalAmount || 0,
        paymentStatus: data.paymentStatus || "waived",
        paymentRequired: data.paymentRequired || false,
        upiLink: data.upiLink || "",
        upiQrCodeDataUrl: data.upiQrCodeDataUrl || "",
        receiptNumber: data.booking?.receiptNumber || "",
      });

      setMessage("Booking Confirmed Successfully");
      setSuccessRedirectTarget(data.paymentRequired ? "/payment" : "/history");
      setBookingQrCode(data.qrCodeDataUrl || "");
      setSelectedSlot("");
      speakConfirmation(selectedSlotDetails?.slotTime);

      const refreshed = await slotService.getSlots(date);
      setSlots(refreshed.slots || []);
      setRecommendation(refreshed.recommendation);
      setShopRecommendation(refreshed.shopRecommendation);
      setAvailableDates(
        refreshed.availableDates?.length
          ? refreshed.availableDates
          : deriveAvailableDates(refreshed.slots || [])
      );
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Booking failed";

      if (message.includes("entitlement")) {
        try {
          const data = await authService.getCurrentUser();
          setProfileUser(data.user || user);
        } catch {
          // Keep the current profile fallback if refresh fails.
        }
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const syncOfflineActions = async () => {
      if (!navigator.onLine) {
        return;
      }

      const queuedActions = offlineQueue.getAll();
      if (!queuedActions.length) {
        return;
      }

      for (const action of queuedActions) {
        if (action.type === "booking") {
          try {
            await bookingService.createBooking(action.payload);
          } catch {
            return;
          }
        }
      }

      offlineQueue.clear();
      setOfflineMessage("Offline kiosk actions synced successfully.");
    };

    window.addEventListener("online", syncOfflineActions);
    syncOfflineActions();

    return () => window.removeEventListener("online", syncOfflineActions);
  }, []);

  const submitGrievance = async (event) => {
    event.preventDefault();

    try {
      await grievanceService.create(grievanceForm);
      setGrievanceForm({
        category: "delay",
        description: "",
        proofUrl: "",
      });
      setMessage("Grievance submitted successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit grievance");
    }
  };

  return (
    <Layout title="Products & Slot Booking">
      <Card className="booking-shell">
        <img
          src="/images/misc/TamilNadu_Logo.svg.png"
          alt="Tamil Nadu logo"
          className="portal-logo small"
        />
        <div className="booking-header">
          <div>
            <span className="eyebrow">Government Slot Booking</span>
            <h2>Book your ration slot</h2>
            <p className="hero-copy compact-copy">
              Choose only from future available dates and confirm your visit in one step.
            </p>
          </div>
          {selectedShop && (
            <div className="booking-badge">
              <strong>{selectedShop.shopName}</strong>
              <span>{selectedShop.location}</span>
            </div>
          )}
        </div>

        <section className="panel-card">
          <div className="card-heading">
            <h3>Available slot dates</h3>
            <span className="stock-chip">Available</span>
          </div>
          {loading && !availableDates.length ? (
            <div className="date-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={`date-skeleton-${index}`} className="date-card">
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-line skeleton-line-short" />
                </div>
              ))}
            </div>
          ) : error && !availableDates.length ? (
            <p className="error-text">
              {error.includes("User no longer exists")
                ? "Your session expired after recent data changes. Please sign in again to load upcoming slots."
                : error}
            </p>
          ) : availableDates.length ? (
            <div className="date-grid">
              {availableDates.map((entry) => (
                <button
                  key={entry.date}
                  type="button"
                  className={`date-card ${date === entry.date ? "active" : ""}`}
                  onClick={() => setDate(entry.date)}
                >
                  <strong>{new Date(entry.date).toLocaleDateString()}</strong>
                  <span>{entry.availableSlotsCount} slots open</span>
                  <small>{entry.badge}</small>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No slots available today"
              description="Please retry or choose the next available date to continue your booking."
              icon="calendar"
              action={
                <div className="inline-actions empty-state-actions">
                  <Button variant="ghost" type="button" onClick={() => setDate((current) => current)}>
                    Retry
                  </Button>
                  {!!nextAvailableDate && (
                    <Button variant="primary" type="button" onClick={() => setDate(nextAvailableDate)}>
                      Next available date
                    </Button>
                  )}
                </div>
              }
            />
          )}
        </section>

        <section className="panel-card">
          <div className="card-heading">
            <h3>Free ration items</h3>
            <span className="stock-chip">Free</span>
          </div>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <article key={`free-product-skeleton-${index}`} className="product-card">
                  <Skeleton className="product-image skeleton-product-image" rounded />
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line skeleton-line-wide" />
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-pill" rounded />
                </article>
              ))}
            </div>
          ) : freeProducts.length ? (
            <div className="product-grid">
              {freeProducts.map((product) => {
                const availableStock = getAvailableStock(product.id);
                const currentQuantity = selectedProducts[product.id] ?? 0;
                const maxQuantity = Math.min(availableStock, product.maxQuantity);

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    availableStock={availableStock}
                    quantity={currentQuantity}
                    maxQuantity={maxQuantity}
                    onQuantityChange={(nextQuantity) => handleQuantityChange(product.id, nextQuantity)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No data available"
              description="No free ration items are available for this card right now."
              icon="box"
            />
          )}
        </section>

        <section className="panel-card">
          <div className="card-heading">
            <h3>Paid ration items</h3>
            <span className="stock-chip">UPI required</span>
          </div>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <article key={`paid-product-skeleton-${index}`} className="product-card">
                  <Skeleton className="product-image skeleton-product-image" rounded />
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line skeleton-line-wide" />
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-pill" rounded />
                </article>
              ))}
            </div>
          ) : paidProducts.length ? (
            <div className="product-grid">
              {paidProducts.map((product) => {
                const availableStock = getAvailableStock(product.id);
                const currentQuantity = selectedProducts[product.id] ?? 0;
                const maxQuantity = Math.min(availableStock, product.maxQuantity);

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    availableStock={availableStock}
                    quantity={currentQuantity}
                    maxQuantity={maxQuantity}
                    onQuantityChange={(nextQuantity) => handleQuantityChange(product.id, nextQuantity)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No data available"
              description="No paid ration items are available for this card right now."
              icon="box"
            />
          )}
        </section>

        <section className="panel-card entitlement-panel">
          <div className="card-heading">
            <h3>You will receive</h3>
            <span className="stock-chip">{user?.cardType || "Card"}</span>
            <span className="stock-chip">{activeUser?.cardType || "Card"}</span>
          </div>
          <div className="list-grid compact-grid">
            <article className="list-card">
              <strong>Rice</strong>
              <p>{entitlement.riceKg || entitlement.rice || 0} kg</p>
            </article>
            <article className="list-card">
              <strong>Sugar</strong>
              <p>{entitlement.sugarKg || entitlement.sugar || 0} kg</p>
            </article>
            <article className="list-card">
              <strong>Wheat</strong>
              <p>{entitlement.wheatKg || entitlement.wheat || 0} kg</p>
            </article>
            <article className="list-card">
              <strong>Oil</strong>
              <p>{entitlement.oilLitres || entitlement.oil || 0} L</p>
            </article>
          </div>
        </section>

        {recommendation && (
          <article className="recommendation-card">
            <span className="eyebrow">Recommended Slot</span>
            <h3>{recommendation.slotTime}</h3>
            <p>{recommendation.reason}</p>
          </article>
        )}

        {shopRecommendation && (
          <article className="recommendation-card">
            <span className="eyebrow">Recommended Shop</span>
            <h3>{shopRecommendation.shopName}</h3>
            <p>
              {shopRecommendation.location} - {shopRecommendation.reason}
            </p>
          </article>
        )}

        <form className="form-grid" onSubmit={handleBooking}>
          <label>
            Select Shop
            <select value={shopId} onChange={(event) => setShopId(event.target.value)} required>
              <option value="">Choose a shop</option>
              {shops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.shopName} ({shop.location})
                </option>
              ))}
            </select>
          </label>

          {loading && date ? (
            <div className="slot-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`slot-skeleton-${index}`} className="slot-card">
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-line skeleton-line-short" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {!!date && !slots.length && (
                <EmptyState
                  title="No slots available today"
                  description="Try again or choose the next available date for faster booking."
                  icon="calendar"
                  action={
                    <div className="inline-actions empty-state-actions">
                      <Button variant="ghost" type="button" onClick={() => setDate((current) => current)}>
                        Retry
                      </Button>
                      {!!nextAvailableDate && (
                        <Button variant="primary" type="button" onClick={() => setDate(nextAvailableDate)}>
                          Next available date
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
              {!!slots.length && !selectableSlots.length && (
                <EmptyState
                  title="No slots available today"
                  description="All current slots are full or reserved. Please retry in a moment."
                  icon="calendar"
                  action={
                    <div className="inline-actions empty-state-actions">
                      <Button variant="ghost" type="button" onClick={() => setDate((current) => current)}>
                        Retry
                      </Button>
                      {!!nextAvailableDate && (
                        <Button variant="primary" type="button" onClick={() => setDate(nextAvailableDate)}>
                          Next available date
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot._id}
                    type="button"
                    className={`slot-card ${selectedSlot === slot._id ? "active" : ""}`}
                    disabled={slot.remaining <= 0 || !slot.priorityEligible}
                    onClick={() => setSelectedSlot(slot._id)}
                  >
                    <strong>{slot.slotTime}</strong>
                    <span>{slot.remaining} spots left</span>
                    {slot.isDynamic && <small>Dynamic demand slot</small>}
                    {slot.priorityOnly && (
                      <small>Reserved for {slot.priorityCategory} beneficiaries</small>
                    )}
                    {!slot.priorityEligible && <small>Not eligible for your profile</small>}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="payment-summary booking-summary">
            <p>Subtotal: Rs {orderSummary.subtotal.toFixed(2)}</p>
            <p>GST (5%): Rs {orderSummary.gst.toFixed(2)}</p>
            <p>
              <strong>Total: Rs {orderSummary.total.toFixed(2)}</strong>
            </p>
          </div>

          {!date && <p className="helper-text">Choose one available date to continue.</p>}
          {!shopId && <p className="helper-text">Choose a shop to enable slot confirmation.</p>}
          {shopId && !selectedSlot && selectableSlots.length > 0 && (
            <p className="helper-text">Select one available slot to continue with booking.</p>
          )}

          {message && (
            <BookingSuccessState
              title={message}
              description={successRedirectTarget === "/payment" ? "Redirecting to payment..." : "Redirecting to history..."}
            />
          )}
          {offlineMessage && <p className="success-text success-banner">{offlineMessage}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="inline-actions">
            <Button variant="primary" type="submit" disabled={submitting || !selectedSlot || !shopId || !date}>
              {submitting ? "Booking slot..." : "Book Slot"}
            </Button>
            <Link className="ui-button ui-button-ghost" to="/payment">
              <span>Proceed to Payment</span>
            </Link>
          </div>
        </form>

        {bookingQrCode && (
          <div className="qr-card success-panel">
            <h3>Booking QR Verification</h3>
            <img src={bookingQrCode} alt="Booking QR code" width="180" height="180" />
            <p>Show this QR at the ration shop counter for fast verification.</p>
          </div>
        )}

        <Card className="nested-panel">
          <h2>Report an Issue</h2>
          <form className="form-grid" onSubmit={submitGrievance}>
            <label>
              Category
              <select
                value={grievanceForm.category}
                onChange={(event) =>
                  setGrievanceForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option value="delay">Delay</option>
                <option value="overcharging">Overcharging</option>
                <option value="denied_stock">Denied stock</option>
                <option value="corruption">Corruption</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Description
              <input
                value={grievanceForm.description}
                onChange={(event) =>
                  setGrievanceForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the issue"
                required
              />
            </label>
            <label>
              Proof URL
              <input
                value={grievanceForm.proofUrl}
                onChange={(event) =>
                  setGrievanceForm((current) => ({
                    ...current,
                    proofUrl: event.target.value,
                  }))
                }
                placeholder="Optional proof link"
              />
            </label>
            <Button variant="ghost" type="submit">Submit grievance</Button>
          </form>
        </Card>
      </Card>
    </Layout>
  );
};

export default Booking;
