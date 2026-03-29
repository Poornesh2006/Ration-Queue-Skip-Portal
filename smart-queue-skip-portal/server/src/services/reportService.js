const sanitizeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
};

const buildCsv = (rows) => {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");
  const body = rows
    .map((row) => headers.map((header) => sanitizeCsvValue(row[header])).join(","))
    .join("\n");

  return `${headerLine}\n${body}`;
};

export const generateCsvReport = ({ rows }) => buildCsv(rows);

export const generatePdfReport = async ({ title, sections = [] }) => {
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();

    sections.forEach((section) => {
      doc.fontSize(14).text(section.heading);
      doc.moveDown(0.5);
      section.lines.forEach((line) => {
        doc.fontSize(10).text(line);
      });
      doc.moveDown();
    });

    doc.end();
  });
};
