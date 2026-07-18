import React from "react";

export default function ComingSoon({ title, note }) {
  return (
    <div className="glass-card rounded-3xl p-12 text-center max-w-lg mx-auto">
      <div className="arch-frame w-24 h-28 bg-ink-800 mx-auto mb-5" />
      <div className="font-display text-xl text-gold-400 mb-2">{title}</div>
      <p className="text-sm text-cream/50 leading-relaxed">{note || "এই মডিউল পরবর্তী ধাপে যোগ করা হবে।"}</p>
    </div>
  );
}
