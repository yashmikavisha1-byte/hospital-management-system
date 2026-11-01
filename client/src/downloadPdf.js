import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadPdf({ title, columns, rows, filename }) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);

  if (rows.length === 0) {
    doc.text("No records found.", 14, 40);
  } else {
    autoTable(doc, {
      startY: 34,
      head: [columns],
      body: rows,
      headStyles: { fillColor: [20, 160, 140] },
    });
  }
  doc.save(filename || "report.pdf");
}