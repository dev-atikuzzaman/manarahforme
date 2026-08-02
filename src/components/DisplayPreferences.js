import React, { useState } from "react";
import { FONT_OPTIONS, SIZE_OPTIONS, getSavedFont, getSavedSize, saveDisplayPrefs } from "../lib/displayPrefs";

export default function DisplayPreferences() {
  const [font, setFont] = useState(getSavedFont());
  const [size, setSize] = useState(getSavedSize());

  function handleFontChange(key) {
    setFont(key);
    saveDisplayPrefs(key, size);
  }

  function handleSizeChange(key) {
    setSize(key);
    saveDisplayPrefs(font, key);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-sm text-cream/60 mb-2">ফন্ট বাছাই করুন</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFontChange(f.key)}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                  font === f.key ? "bg-gold-500/15 border-gold-500/40 text-gold-300" : "border-white/10 text-cream/60 hover:bg-white/5"
                }`}
                style={{ fontFamily: f.stack }}
              >
                <div className="text-xs text-cream/35 mb-0.5" style={{ fontFamily: "inherit" }}>{f.label}</div>
                <div className="text-base">আমার মসজিদ ও মাদ্রাসা</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-cream/60 mb-2">লেখার সাইজ</div>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => handleSizeChange(s.key)}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition ${
                  size === s.key ? "bg-gold-500/15 border-gold-500/40 text-gold-300" : "border-white/10 text-cream/60 hover:bg-white/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-cream/35 leading-relaxed pt-2 border-t border-gold-500/10">
          এই পছন্দ শুধু এই ডিভাইস/ব্রাউজারে সংরক্ষিত থাকবে — সাথে সাথে পুরো অ্যাপে প্রয়োগ হবে।
          "Times New Roman" আপনার ফোনে আগে থেকে ইনস্টল না থাকলে স্বয়ংক্রিয়ভাবে অন্য ফন্টে দেখাবে।
        </p>
      </div>
    </div>
  );
}
