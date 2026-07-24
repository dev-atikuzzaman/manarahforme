import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QRCodeModal({ student, onClose }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (!student?.attendance_code) return;
    QRCode.toCanvas(canvasRef.current, student.attendance_code, { width: 260, margin: 2, color: { dark: "#04120c", light: "#f4ead9" } });
    QRCode.toDataURL(student.attendance_code, { width: 720, margin: 2, color: { dark: "#04120c", light: "#f4ead9" } }).then(setDataUrl);
  }, [student]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${student.name}.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={onClose}>
      <div className="glass-card rounded-3xl p-6 max-w-xs w-full text-center anim-in" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg text-gold-400 mb-1">{student.name}</div>
        <div className="text-xs text-cream/40 mb-4">উপস্থিতির QR কোড</div>
        <div className="bg-cream rounded-2xl p-3 inline-block">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-[11px] text-cream/35 mt-3">এটা প্রিন্ট করে আইডি কার্ডে বা ব্যাগে রাখুন — স্টাফ প্রতিদিন এটা স্ক্যান করে হাজিরা দেবে।</p>
        <div className="flex gap-2 mt-4">
          <button onClick={download} className="flex-1 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2 text-sm">ডাউনলোড করুন</button>
          <button onClick={onClose} className="flex-1 border border-gold-500/30 text-cream/70 rounded-xl py-2 text-sm">বন্ধ করুন</button>
        </div>
      </div>
    </div>
  );
}
