import React from "react";

/**
 * আরবি "মীম" (م) হরফের ক্যালিগ্রাফিক আদ্যক্ষর — মানারাহ (منارة = আলোকবর্তিকা/মিনার)।
 * এই একই মার্ক পুরো অ্যাপে (favicon, app icon, ল্যান্ডিং, সাইডবার, সব অথ স্ক্রিন) ব্যবহৃত হয় —
 * public/favicon.png, logo192.png, logo512.png, maskable-icon.png এই একই ডিজাইন থেকে তৈরি।
 */
export default function Logo({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="-90 -140 280 280" className={className} aria-label="মানারাহ">
      <defs>
        <linearGradient id="manarah-logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="55%" stopColor="#f5b400" />
          <stop offset="100%" stopColor="#c98a00" />
        </linearGradient>
      </defs>
      <ellipse cx="-6" cy="-70" rx="46" ry="40" transform="rotate(-8 -6 -70)" fill="none" stroke="url(#manarah-logo-gold)" strokeWidth="24" />
      <path d="M -6 -30 C -4 20 10 66 62 92 C 100 111 132 108 150 96" fill="none" stroke="url(#manarah-logo-gold)" strokeWidth="24" strokeLinecap="round" />
      <circle cx="150" cy="96" r="12" fill="url(#manarah-logo-gold)" />
    </svg>
  );
}
