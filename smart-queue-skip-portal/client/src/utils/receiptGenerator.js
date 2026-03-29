import { jsPDF } from "jspdf";

export const generateReceiptPdf = (order) => {
  const doc = new jsPDF();
  let line = 20;

  doc.setFontSize(18);
  doc.text("Smart Queue Skip Portal Receipt", 20, line);
  line += 12;

  doc.setFontSize(11);
  doc.text(`Receipt No: ${order.receiptNumber || "-"}`, 20, line);
  line += 8;
  doc.text(`Name: ${order.userName || "-"}`, 20, line);
  line += 8;
  doc.text(`Ration Card: ${order.rationCardNumber || "-"}`, 20, line);
  line += 8;
  doc.text(`Slot: ${order.slotTime || "-"}`, 20, line);
  line += 8;
  doc.text(`Date: ${order.date || "-"}`, 20, line);
  line += 12;

  doc.setFontSize(13);
  doc.text("Items", 20, line);
  line += 8;
  doc.setFontSize(11);

  (order.items || []).forEach((item) => {
    doc.text(
      `${item.name} - ${item.quantity} ${item.unit || ""} - Rs ${Number(item.amount || 0).toFixed(2)}`,
      20,
      line
    );
    line += 8;
  });

  line += 4;
  doc.text(`Total Amount: Rs ${Number(order.totalAmount || order.total || 0).toFixed(2)}`, 20, line);
  line += 8;
  doc.text(`Payment Status: ${order.paymentStatus || "-"}`, 20, line);
  line += 8;
  doc.text(`Transaction ID: ${order.transactionId || "-"}`, 20, line);

  doc.save(`receipt-${order.receiptNumber || Date.now()}.pdf`);
};
