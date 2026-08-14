import React, { useState } from "react";

// পাসওয়ার্ড টাইপ করার সব জায়গায় ব্যবহারের জন্য একটাই কম্পোনেন্ট — ডান পাশে
// চোখ (eye) আইকনে ক্লিক করে পাসওয়ার্ড দেখা/লুকানো যায়। ইনপুটের নিজের className
// এখানেই পাস করা হয় (আগে যেভাবে <input> এ সরাসরি দেওয়া হতো ঠিক সেভাবেই), আর
// এই কম্পোনেন্ট নিজে থেকে right padding যোগ করে দেয় যাতে টেক্সট আইকনের নিচে
// ঢাকা না পড়ে।
export default function PasswordInput({ className = "", wrapperClassName = "", iconClassName = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative w-full ${wrapperClassName}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-cream/40 hover:text-cream/80 transition ${iconClassName}`}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.22 4.49" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
