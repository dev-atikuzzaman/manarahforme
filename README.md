# মিনার (Minar) — মসজিদ ও মাদ্রাসা ম্যানেজমেন্ট PWA

React (CRA) + Tailwind + Supabase (Auth + Postgres + Realtime), Vercel-এ ডিপ্লয়যোগ্য।

## ধাপ ১ — Supabase সেটআপ
1. supabase.com-এ নতুন প্রজেক্ট বানান।
2. SQL Editor-এ `supabase_schema.sql`-এর পুরো কন্টেন্ট পেস্ট করে Run করুন।
3. Authentication → Providers → Email চালু আছে কিনা দেখুন। Confirm email বন্ধ রাখলে টেস্ট করা সহজ হবে (Authentication → Settings)।
4. Project Settings → API থেকে `Project URL` ও `anon public key` কপি করুন।

## ধাপ ২ — লোকাল রান
```
npm install
```
প্রজেক্ট রুটে `.env` ফাইল বানিয়ে দিন:
```
REACT_APP_SUPABASE_URL=your-project-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```
```
npm start
```

## ধাপ ৩ — Vercel ডিপ্লয়
1. GitHub-এ রিপো পুশ করুন (individual ফাইল আপলোড করেও করা যায়, যেমন আগে করেছো)।
2. Vercel-এ Import Project করুন।
3. Project Settings → Environment Variables-এ:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
4. Redeploy করুন।

## প্রথম ব্যবহার
- হোমপেজে "বিনামূল্যে শুরু করুন" → "নতুন প্রতিষ্ঠান খুলুন" দিয়ে নিজের মসজিদ/মাদ্রাসা তৈরি করুন — আপনি স্বয়ংক্রিয়ভাবে সুপার এডমিন হবেন।
- একটা ইনভাইট কোড পাবেন (Overview ট্যাবেও দেখা যাবে) — অন্য এডমিন/ভিউয়ার এই কোড দিয়ে "কোড দিয়ে যোগ দিন" থেকে যোগ দেবে, "সদস্য অনুমোদন" ট্যাব থেকে অনুমোদন দিতে হবে।

## এখন যা কাজ করে
- মাল্টি-টেন্যান্ট প্রতিষ্ঠান + রোল-বেজড এক্সেস (super_admin / branch_admin / viewer) + অনুমোদন ওয়ার্কফ্লো
- শিক্ষার্থী/সদস্য CRUD (রিয়েল-টাইম)
- দৈনিক উপস্থিতি + হিফজ অগ্রগতি (রিয়েল-টাইম)
- দান ট্র্যাকিং + যাকাত (নিসাব) ক্যালকুলেটর
- লাইভ ওভারভিউ ড্যাশবোর্ড
- PWA (manifest + service worker, অফলাইনে খোলা যাবে)

## পরের ধাপে যা যোগ হবে (স্কিমা আগে থেকেই প্রস্তুত)
- কুরবানি ভাগ ব্যবস্থাপনা (`qurbani_shares` টেবিল রেডি)
- বিস্তারিত একাউন্টিং (`ledger_entries` টেবিল রেডি)
- SMS/পুশ নোটিফিকেশন, PDF/Excel এক্সপোর্ট, অভিভাবক পোর্টাল

প্রতিটা মডিউল আলাদা ফাইলে (src/components/modules/) — তাই নতুন করে চাইলে একটার পর একটা ফাইল হিসেবে চেয়ে নিতে পারো, পুরো zip লাগবে না।
