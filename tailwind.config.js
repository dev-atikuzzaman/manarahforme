/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04120c",
          900: "#071d14",
          800: "#0c2b1e",
          700: "#123a28",
          600: "#1a4d35",
          500: "#256e49",
        },
        gold: {
          300: "#ffe08a",
          400: "#ffcf5c",
          500: "#f5b400",
          600: "#e09b00",
        },
        cream: "#f4ead9",
      },
      fontFamily: {
        // অগ্রাধিকার অনুযায়ী: Siyam Rupali / NikoshBan / Times New Roman — এগুলো এমবেড করা
        // ফন্ট না, ব্যবহারকারীর ফোনে আগে থেকে ইনস্টল থাকলে (বাংলাদেশে Avro/Bijoy দিয়ে প্রায়ই
        // থাকে) ব্রাউজার সেটাই দেখাবে। না থাকলে আমাদের এমবেড করা Noto Sans Bengali/Hind
        // Siliguri-তে পড়বে, যাতে লেখা কখনো ভাঙা বা অদৃশ্য না হয়।
        display: ["'Siyam Rupali'", "'NikoshBan'", "'Times New Roman'", "Georgia", "'Noto Serif Bengali'", "serif"],
        sans: ["'Siyam Rupali'", "'NikoshBan'", "'Times New Roman'", "'Hind Siliguri'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(245,180,0,0.15)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(circle at 20% 10%, rgba(245,180,0,0.10), transparent 40%), radial-gradient(circle at 80% 80%, rgba(26,77,53,0.35), transparent 45%)",
      },
      borderRadius: {
        arch: "50% 50% 0 0 / 18% 18% 0 0",
      },
    },
  },
  plugins: [],
};
