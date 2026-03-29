const percentile = (values, p) => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
};

const getDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const sumTransactionQuantity = (transaction) =>
  transaction.items.reduce((total, item) => total + item.quantity, 0);

export const runFraudDetection = ({ users, bookings, transactions, shops, histories = [] }) => {
  const quantitySeries = transactions.map(sumTransactionQuantity);
  const bookingSeries = bookings.map(() => 1);
  const quantityThreshold = Math.max(10, percentile(quantitySeries, 85));
  const quickRepeatThresholdHours = 12;

  const userBookingMap = bookings.reduce((acc, booking) => {
    const key = booking.user._id.toString();
    acc[key] = acc[key] || [];
    acc[key].push(booking);
    return acc;
  }, {});

  const userTransactionMap = transactions.reduce((acc, transaction) => {
    const key = transaction.user._id.toString();
    acc[key] = acc[key] || [];
    acc[key].push(transaction);
    return acc;
  }, {});

  const userHistoryMap = histories.reduce((acc, entry) => {
    const key = entry.user?._id?.toString?.() || entry.user?.toString?.();

    if (!key) {
      return acc;
    }

    acc[key] = acc[key] || [];
    acc[key].push(entry);
    return acc;
  }, {});

  const stockMismatchMap = shops.map((shop) => {
    const soldByItem = {};

    transactions
      .filter((transaction) => transaction.shop._id.toString() === shop._id.toString())
      .forEach((transaction) => {
        transaction.items.forEach((item) => {
          soldByItem[item.item] = (soldByItem[item.item] || 0) + item.quantity;
        });
      });

    const mismatches = ["rice", "wheat", "sugar", "kerosene"]
      .map((item) => {
        const expected = (shop.initialStock?.[item] || 0) - (soldByItem[item] || 0);
        const actual = shop.stock?.[item] || 0;
        const variance = Math.abs(expected - actual);

        if (variance >= 15) {
          return {
            item,
            expected,
            actual,
            variance,
          };
        }

        return null;
      })
      .filter(Boolean);

    return {
      shop,
      mismatches,
    };
  });

  const suspiciousUsers = users
    .map((user) => {
      const userBookings = (userBookingMap[user._id.toString()] || []).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const userTransactions = userTransactionMap[user._id.toString()] || [];
      const userHistory = (userHistoryMap[user._id.toString()] || []).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      let score = 0;
      const reasons = [];

      const dailyTransactions = userTransactions.reduce((acc, transaction) => {
        const key = getDateKey(transaction.transactionDate);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      Object.entries(dailyTransactions).forEach(([day, count]) => {
        if (count > 3) {
          score += Math.min(35, count * 8);
          reasons.push(`More than 3 transactions on ${day}`);
        }
      });

      userTransactions.forEach((transaction) => {
        const quantity = sumTransactionQuantity(transaction);
        if (quantity >= quantityThreshold) {
          score += 18;
          reasons.push(`Large purchase quantity (${quantity})`);
        }
      });

      const largePurchases = userTransactions.filter(
        (transaction) => sumTransactionQuantity(transaction) >= quantityThreshold
      );

      if (largePurchases.length >= 2) {
        score += 14;
        reasons.push("Repeated high-quantity purchases");
      }

      for (let index = 1; index < userBookings.length; index += 1) {
        const previous = new Date(userBookings[index - 1].createdAt || userBookings[index - 1].date);
        const current = new Date(userBookings[index].createdAt || userBookings[index].date);
        const hours = (current - previous) / (1000 * 60 * 60);

        if (hours >= 0 && hours <= quickRepeatThresholdHours) {
          score += 14;
          reasons.push("Repeated booking attempts in a short time window");
          break;
        }
      }

      const stockMismatch = stockMismatchMap.find(
        ({ shop, mismatches }) =>
          mismatches.length > 0 &&
          userTransactions.some(
            (transaction) => transaction.shop._id.toString() === shop._id.toString()
          )
      );

      if (stockMismatch?.mismatches.length) {
        score += 12;
        reasons.push("Linked shop has stock mismatch");
      }

      const loginHistory = userHistory.filter((entry) => entry.actionType === "login");
      const uniqueDevices = new Set(loginHistory.map((entry) => entry.device).filter(Boolean));
      const uniqueIps = new Set(loginHistory.map((entry) => entry.ipAddress).filter(Boolean));

      if (uniqueDevices.size >= 3) {
        score += 16;
        reasons.push("Frequent logins from multiple devices");
      }

      if (uniqueIps.size >= 3) {
        score += 12;
        reasons.push("Logins observed from multiple IP addresses");
      }

      for (let index = 1; index < loginHistory.length; index += 1) {
        const previous = loginHistory[index - 1];
        const current = loginHistory[index];
        const hours = (new Date(current.timestamp) - new Date(previous.timestamp)) / (1000 * 60 * 60);

        if (
          hours >= 0 &&
          hours <= 6 &&
          previous.ipAddress &&
          current.ipAddress &&
          previous.ipAddress !== current.ipAddress
        ) {
          score += 15;
          reasons.push("Rapid IP switching between login attempts");
          break;
        }
      }

      const cancelledBookings = userBookings.filter((entry) => entry.status === "cancelled");
      if (cancelledBookings.length >= 2) {
        score += 12;
        reasons.push("Repeated booking cancellations");
      }

      return {
        userId: user._id,
        name: user.name,
        rationCardNumber: user.rationCardNumber,
        fraudScore: Math.min(100, score),
        reasons: [...new Set(reasons)],
        priorityCategory: user.priorityCategory,
        explainability: reasons.map((reason) => ({
          label: reason,
          impact: reason.includes("Large") ? "high" : "medium",
        })),
      };
    })
    .filter((entry) => entry.fraudScore >= 20)
    .sort((a, b) => b.fraudScore - a.fraudScore);

  const suspiciousDealers = shops
    .map((shop) => {
      const shopTransactions = transactions.filter(
        (transaction) => transaction.shop._id.toString() === shop._id.toString()
      );
      const mismatchEntry = stockMismatchMap.find(
        (entry) => entry.shop._id.toString() === shop._id.toString()
      );

      let dealerScore = 0;
      const reasons = [];

      if (shopTransactions.length > 18) {
        dealerScore += 20;
        reasons.push("Unusually high transaction volume");
      }

      if (mismatchEntry?.mismatches.length) {
        dealerScore += mismatchEntry.mismatches.length * 18;
        reasons.push("Detected stock mismatch between expected and actual stock");
      }

      if ((shop.stock?.rice || 0) <= 60 || (shop.stock?.wheat || 0) <= 30) {
        dealerScore += 12;
        reasons.push("Sharp stock depletion in essential commodities");
      }

      return {
        shopId: shop._id,
        shopCode: shop.shopId,
        shopName: shop.shopName,
        dealerName: shop.dealerName,
        dealerFraudScore: Math.min(100, dealerScore),
        reasons,
      };
    })
    .filter((entry) => entry.dealerFraudScore >= 20)
    .sort((a, b) => b.dealerFraudScore - a.dealerFraudScore);

  const stockMismatchAlerts = stockMismatchMap
    .filter(({ mismatches }) => mismatches.length > 0)
    .map(({ shop, mismatches }) => ({
      shopId: shop.shopId,
      shopName: shop.shopName,
      mismatches,
    }));

  return {
    suspiciousUsers,
    suspiciousDealers,
    stockMismatchAlerts,
    modelInfo: {
      method: "Unsupervised anomaly scoring with threshold heuristics",
      quantityThreshold,
      quickRepeatThresholdHours,
      bookingBaseline: bookingSeries.length,
    },
  };
};
