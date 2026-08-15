import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportExcel({ filename, sheetName, headers, rows }) {
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
  XLSX.writeFile(wb, filename);
}

async function ensureBengaliFont(doc) {
  // বাংলা ফন্ট শুধু PDF এক্সপোর্টের সময়ই লোড হয় (~190KB) — মূল অ্যাপ বান্ডেলকে ভারী করে না।
  const { notoSansBengaliRegular, notoSansBengaliBold } = await import("./fonts/notoSansBengali");
  doc.addFileToVFS("NotoSansBengali-Regular.ttf", notoSansBengaliRegular);
  doc.addFont("NotoSansBengali-Regular.ttf", "NotoBengali", "normal");
  doc.addFileToVFS("NotoSansBengali-Bold.ttf", notoSansBengaliBold);
  doc.addFont("NotoSansBengali-Bold.ttf", "NotoBengali", "bold");
}

/**
 * বাংলা টেক্সট সঠিকভাবে দেখানোর জন্য কাস্টম ফন্ট এমবেড করা PDF এক্সপোর্ট।
 * (সাধারণ jsPDF ডিফল্ট ফন্টে বাংলা ইউনিকোড রেন্ডার হয় না — এখানে সেটা সমাধান করা আছে।)
 */
export async function exportPDF({ filename, title, subtitle, headers, rows, orientation = "landscape" }) {
  const doc = new jsPDF({ orientation });
  await ensureBengaliFont(doc);
  doc.setFont("NotoBengali", "bold");
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  if (subtitle) {
    doc.setFont("NotoBengali", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, 14, 21);
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 27 : 22,
    styles: { font: "NotoBengali", fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26, 77, 53], textColor: [255, 255, 255], font: "NotoBengali" },
    bodyStyles: { textColor: [30, 30, 30] },
  });

  doc.save(filename);
}

/**
 * দান/যাকাতের জন্য একটা প্রস্তুত-বিন্যাসের রশিদ (voucher-style, টেবিল রিপোর্ট না) —
 * প্রতিষ্ঠানের নাম, রশিদ নম্বর, দাতার তথ্য, পরিমাণ, তারিখ ও স্বাক্ষরের জায়গাসহ।
 */
export async function exportReceipt({ institutionName, receiptNo, donorName, amount, purpose, note, date }) {
  const doc = new jsPDF({ orientation: "portrait", format: "a5" });
  await ensureBengaliFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const boxTop = 12;
  const boxBottom = doc.internal.pageSize.getHeight() - 12;

  // বাইরের বর্ডার
  doc.setDrawColor(180, 140, 20);
  doc.setLineWidth(0.6);
  doc.rect(margin - 4, boxTop, pageWidth - (margin - 4) * 2, boxBottom - boxTop);

  let y = boxTop + 12;
  const centerX = pageWidth / 2;

  doc.setFont("NotoBengali", "bold");
  doc.setFontSize(16);
  doc.text(institutionName || "মিনার", centerX, y, { align: "center" });

  y += 7;
  doc.setFont("NotoBengali", "normal");
  doc.setFontSize(11);
  doc.text("দান রশিদ", centerX, y, { align: "center" });

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`রশিদ নম্বর: ${receiptNo}`, margin, y);
  doc.text(`তারিখ: ${date}`, pageWidth - margin, y, { align: "right" });

  y += 10;
  doc.setTextColor(20, 20, 20);
  const row = (label, value) => {
    doc.setFont("NotoBengali", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(label, margin, y);
    doc.setFont("NotoBengali", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), margin + 32, y);
    y += 9;
  };

  row("দাতার নাম", donorName);
  row("খাত", purpose);
  row("পরিমাণ", `৳${Number(amount).toLocaleString("bn-BD")}`);
  if (note) row("মন্তব্য", note);

  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;
  doc.setFont("NotoBengali", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("জাযাকাল্লাহু খইরান — আপনার দানের জন্য আন্তরিক কৃতজ্ঞতা।", centerX, y, { align: "center" });

  y = boxBottom - 18;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y, margin + 40, y);
  doc.line(pageWidth - margin - 40, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("দাতার স্বাক্ষর", margin + 20, y, { align: "center" });
  doc.text("কর্তৃপক্ষের স্বাক্ষর", pageWidth - margin - 20, y, { align: "center" });

  doc.save(`receipt-${receiptNo}.pdf`);
}

export function exportCSV({ filename, headers, rows }) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
