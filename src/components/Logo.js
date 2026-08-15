import React from "react";

/**
 * আরবি "মীম" (م) হরফের ক্যালিগ্রাফিক আদ্যক্ষর — মূল swash-টা "মিনার" ধারণার সাথে সাযুজ্য
 * রেখে রাখা হয়েছে। বাইরের রিং সরিয়ে ফেলা হয়েছে, আর দুটো ছোট, অর্থবহ অনুষঙ্গ যোগ করা হয়েছে —
 * উপরে একটা ছোট চাঁদ (ইসলামিক প্রতিষ্ঠানের পরিচয়) আর swash-এর শেষ মাথায় একটা ছোট স্পার্ক
 * (আলো/পথনির্দেশ — এই ব্র্যান্ডের মূল ধারণা)। এই একই মার্ক পুরো অ্যাপে (favicon, app icon,
 * ল্যান্ডিং, সাইডবার, সব অথ স্ক্রিন) ব্যবহৃত হয় — public/favicon.png, logo192.png, logo512.png,
 * maskable-icon.png এই একই ডিজাইন থেকে তৈরি (এই PNG ফাইলগুলো আলাদাভাবে রিজেনারেট করা লাগবে,
 * কারণ এই এনভায়রনমেন্টে SVG-কে PNG-তে রেন্ডার করার টুল নেই)।
 */
export default function Logo({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="-80 -150 275 275" className={className} aria-label="মিনার">
      <defs>
        <linearGradient id="minar-logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="55%" stopColor="#f5b400" />
          <stop offset="100%" stopColor="#c98a00" />
        </linearGradient>
      </defs>

      {/* মূল ক্যালিগ্রাফিক swash — "মীম" এর আদল */}
      <ellipse cx="-6" cy="-70" rx="46" ry="40" transform="rotate(-8 -6 -70)" fill="none" stroke="url(#minar-logo-gold)" strokeWidth="24" />
      <path d="M -6 -30 C -4 20 10 66 62 92 C 100 111 132 108 150 96" fill="none" stroke="url(#minar-logo-gold)" strokeWidth="24" strokeLinecap="round" />

      {/* ছোট চাঁদ — ইসলামিক প্রতিষ্ঠানের পরিচয়, সংযত আকারে */}
      <g transform="translate(8.4,-143.6) scale(1.3)">
        <path fill="url(#minar-logo-gold)" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </g>

      {/* swash-এর শেষে ছোট স্পার্ক — আলো/পথনির্দেশের প্রতীক */}
      <path fill="url(#minar-logo-gold)" d="M 176,75 L 180.5,83.5 L 189,88 L 180.5,92.5 L 176,101 L 171.5,92.5 L 163,88 L 171.5,83.5 Z" />
    </svg>
  );
}
