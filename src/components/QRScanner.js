import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onScan, onClose }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const lastCodeRef = useRef({ code: null, time: 0 });
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    const id = "qr-scanner-region";
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const now = Date.now();
          // একই কোড ৩ সেকেন্ডের মধ্যে দ্বিতীয়বার স্ক্যান হলে উপেক্ষা করা হয় (ডুপ্লিকেট বন্ধ)
          if (lastCodeRef.current.code === decodedText && now - lastCodeRef.current.time < 3000) return;
          lastCodeRef.current = { code: decodedText, time: now };
          setLastResult({ code: decodedText, at: now });
          onScan(decodedText);
        },
        () => {} // ফ্রেমে QR না পেলে নীরবে চালিয়ে যাওয়া, এরর দেখানোর দরকার নেই
      )
      .catch((err) => setError("ক্যামেরা চালু করা যায়নি — ব্রাউজারে ক্যামেরা অনুমতি দিন। " + (err?.message || "")));

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-5 max-w-sm w-full anim-in">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-gold-400">QR স্ক্যান করুন</span>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-sm">বন্ধ করুন ✕</button>
        </div>

        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

        <div id="qr-scanner-region" ref={containerRef} className="rounded-2xl overflow-hidden bg-black" />

        <p className="text-[11px] text-cream/35 mt-3 text-center">শিক্ষার্থীর QR কোড ক্যামেরার সামনে ধরুন — স্ক্যান হলেই স্বয়ংক্রিয়ভাবে উপস্থিত হিসেবে চিহ্নিত হবে।</p>

        {lastResult && (
          <div className="mt-2 text-center text-xs text-emerald-400">সর্বশেষ স্ক্যান সফল ✓</div>
        )}
      </div>
    </div>
  );
}
