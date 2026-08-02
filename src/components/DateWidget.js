import React, { useEffect, useState } from "react";
import { getBengaliDate, getHijriDate, getBengaliWeekday, getEnglishDate, toBnDigits } from "../lib/calendars";

function useToday() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // মধ্যরাতে তারিখ নিজে থেকে বদলে যাক
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function DateWidget({ compact = false }) {
  const now = useToday();
  const weekday = getBengaliWeekday(now);
  const en = getEnglishDate(now);
  const bn = getBengaliDate(now);
  const hijri = getHijriDate(now);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-display text-gold-300">{weekday}</span>
        <span className="text-cream/30">·</span>
        <span className="text-cream/60">{en.day} {en.month}, {en.year}</span>
        <span className="text-cream/30 hidden sm:inline">·</span>
        <span className="text-gold-400/80 hidden sm:inline">{toBnDigits(bn.day)} {bn.month} {toBnDigits(bn.year)}</span>
        <span className="text-cream/30 hidden md:inline">·</span>
        {hijri && <span className="text-cream/50 hidden md:inline">{toBnDigits(hijri.day)} {hijri.month} {toBnDigits(hijri.year)} হি.</span>}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden relative">
      <div className="blob w-40 h-40 bg-gold-500 -top-10 -right-10 opacity-20" />
      <div className="relative z-10 flex flex-col sm:flex-row">
        <div className="px-6 py-5 sm:border-r border-gold-500/10 flex items-center gap-3 sm:min-w-[180px]">
          <span className="text-2xl text-gold-400">✦</span>
          <div>
            <div className="text-xs text-cream/35 uppercase tracking-wide">আজ</div>
            <div className="font-display text-xl text-gold-300 leading-tight">{weekday}</div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gold-500/10">
          <DateCell label="ইংরেজি" value={`${en.day} ${en.month}, ${en.year}`} />
          <DateCell label="বাংলা" value={`${toBnDigits(bn.day)} ${bn.month}, ${toBnDigits(bn.year)}`} accent />
          <DateCell label="হিজরি" value={hijri ? `${toBnDigits(hijri.day)} ${hijri.month}, ${toBnDigits(hijri.year)} হি.` : "—"} />
        </div>
      </div>
    </div>
  );
}

function DateCell({ label, value, accent }) {
  return (
    <div className="px-6 py-4 flex flex-col justify-center">
      <div className="text-xs text-cream/35 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${accent ? "text-gold-300" : "text-cream/80"}`}>{value}</div>
    </div>
  );
}
