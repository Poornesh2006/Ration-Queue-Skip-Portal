import cron from "node-cron";
import { Booking } from "../models/Booking.js";

let notificationSchedulerStarted = false;

export const sendNotification = ({ channel = "console", title, message, user }) => {
  console.log(
    `[notification:${channel}] ${title} | ${message} | recipient=${user?.rationCardNumber || "system"}`
  );
};

export const sendStockAvailabilityNotification = ({ product, users = [] }) => {
  users.slice(0, 20).forEach((user) => {
    sendNotification({
      channel: "sms-simulated",
      title: "Stock availability update",
      message: `${product.name} is available with current stock ${product.stockAvailable} ${product.unit}.`,
      user,
    });
  });
};

export const startNotificationScheduler = () => {
  if (notificationSchedulerStarted) {
    return;
  }

  notificationSchedulerStarted = true;
  cron.schedule("*/30 * * * *", async () => {
    const reminderWindow = new Date();
    reminderWindow.setDate(reminderWindow.getDate() + 1);
    const start = new Date(reminderWindow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(reminderWindow);
    end.setHours(23, 59, 59, 999);

    const upcomingBookings = await Booking.find({
      date: { $gte: start, $lte: end },
      status: "booked",
    }).populate("user", "name rationCardNumber");

    upcomingBookings.slice(0, 5).forEach((booking) => {
      sendNotification({
        title: "Slot reminder",
        message: `Reminder: you have a ration pickup booking on ${new Date(
          booking.date
        ).toDateString()}`,
        user: booking.user,
      });
    });
  });
};
