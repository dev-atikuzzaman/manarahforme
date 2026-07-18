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
