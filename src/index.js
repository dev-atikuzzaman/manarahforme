import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import PublicInstitutionPage from "./components/PublicInstitutionPage";
import { initDisplayPrefs } from "./lib/displayPrefs";

// আগে সংরক্ষিত ফন্ট/সাইজ পছন্দ থাকলে অ্যাপ রেন্ডার হওয়ার আগেই প্রয়োগ করা হয়,
// যাতে প্রথম দেখাতেই সঠিক ফন্টে দেখা যায় (কোনো ফ্ল্যাশ/ঝাঁকুনি ছাড়া)।
initDisplayPrefs();

// পাবলিক প্রতিষ্ঠান পেজের রুট (/p/<slug>) মূল App-এর লগইন/সেশন লজিকের বাইরে,
// একদম আলাদাভাবে হ্যান্ডেল করা হয় — এখানেই সিদ্ধান্ত নেওয়া হয়, App.js-এর ভেতরে না,
// যাতে React-এর hooks নিয়ম ভাঙার ঝুঁকি না থাকে।
const publicSlugMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {publicSlugMatch ? <PublicInstitutionPage slug={decodeURIComponent(publicSlugMatch[1])} /> : <App />}
  </React.StrictMode>
);
