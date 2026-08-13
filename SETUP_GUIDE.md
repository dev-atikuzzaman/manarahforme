# 🎓 Petro Knowledge Hub v2.0 — Supabase সংস্করণ

আলহামদুলিল্লাহ! আপনার প্রজেক্ট সম্পূর্ণভাবে rebuild করা হয়েছে — Firebase/Google Sheets বাদ দিয়ে **Supabase** দিয়ে, সাথে **real multi-user authentication** যোগ করা হয়েছে।

---

## 🆕 কী কী নতুন/বদলেছে

| আগে (v1) | এখন (v2) |
|---|---|
| Mock data (ভুয়া demo) | আসল Supabase database |
| Google Sheets থেকে read-only data | প্রতিটা সদস্য নিজে signup করে নিজের প্রোফাইল লেখে |
| কোনো login সিস্টেম ছিল না | Email/Password দিয়ে real login |
| Firebase (অব্যবহৃত ছিল) | Supabase (Auth + Database + Storage সব একসাথে) |
| Static mock posts | Real-time posts — যে কেউ পোস্ট দিলে সবার স্ক্রিনে সাথে সাথে দেখা যাবে |
| ছবি আপলোড ছিল না | Supabase Storage দিয়ে real avatar ও post-image আপলোড |

UI ডিজাইন (glass/gradient স্টাইল, নীল রং, ৩-ট্যাব নেভিগেশন) আগের মতোই রাখা হয়েছে — শুধু আরো পরিষ্কার ও ফাংশনাল করা হয়েছে।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
bim-hub/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   ├── favicon.ico, logo192.png, logo512.png
│
├── src/
│   ├── App.js                      ← মূল অ্যাপ shell, navigation
│   ├── index.js, index.css
│   ├── reportWebVitals.js
│   │
│   ├── lib/
│   │   ├── supabaseClient.js       ← Supabase connection
│   │   ├── AuthContext.js          ← Login/Signup/Session ব্যবস্থাপনা
│   │   └── dataService.js          ← posts/comments/reactions/profiles এর সব ফাংশন
│   │
│   ├── components/
│   │   ├── AuthScreen.js           ← Login + Signup স্ক্রিন
│   │   ├── Avatar.js, Badge.js
│   │   ├── ProfileModal.js         ← প্রোফাইল দেখা/এডিট করা
│   │   ├── PostCard.js             ← পোস্ট + কমেন্ট + রিয়্যাকশন
│   │   ├── CreatePostModal.js
│   │   ├── MultiSelect.js          ← ফিল্টার ড্রপডাউন
│   │   └── Icons.js
│   │
│   └── pages/
│       ├── FeedTab.js
│       ├── MembersTab.js
│       ├── StatsTab.js
│       └── AdminPanel.js           ← ৮০ জনের email pre-load করার প্যানেল
│
├── supabase/
│   └── schema.sql                  ⭐ এটা Supabase এ একবার চালাতে হবে
│
├── .env.example
└── package.json
```

---

## ⚙️ ধাপে ধাপে সেটআপ

### ধাপ ১: Supabase প্রজেক্ট তৈরি করুন

1. [supabase.com](https://supabase.com) → Sign up / Login
2. **New Project** → নাম দিন `bim-knowledge-hub`
3. Database password সেট করুন (মনে রাখবেন)
4. Region: **Southeast Asia (Singapore)** বেছে নিন (Bangladesh থেকে সবচেয়ে কাছে)
5. প্রজেক্ট তৈরি হতে ১-২ মিনিট সময় লাগবে

### ধাপ ২: Database Schema বসান

1. Supabase Dashboard → বাম পাশের মেনু থেকে **SQL Editor**
2. **New Query** ক্লিক করুন
3. `supabase/schema.sql` ফাইলের **পুরো কন্টেন্ট** copy করে paste করুন
4. **Run** চাপুন (নিচে ডান কোণায়)
5. সফল হলে "Success. No rows returned" দেখাবে
6. এরপর `supabase/migration_2_notes_updates_documents.sql` ফাইলটাও একইভাবে
   (New Query → পুরো কন্টেন্ট পেস্ট → Run) চালিয়ে নিন — এটা ছাড়া
   **আপডেট, নোট ও ডকুমেন্ট ট্যাব থেকে কিছু সেভ/আপলোড হবে না**, কারণ
   এই ফিচারগুলোর টেবিল ও স্টোরেজ বাকেট এই ফাইলেই তৈরি হয়।

এতে স্বয়ংক্রিয়ভাবে তৈরি হয়ে যাবে:
- ✅ `profiles`, `posts`, `comments`, `reactions`, `pending_invites` টেবিল
- ✅ Row Level Security (RLS) — যাতে কেউ অন্যের একাউন্ট হ্যাক করতে না পারে
- ✅ Real-time subscriptions
- ✅ Storage buckets (avatars, post-images)
- ✅ Signup হলেই স্বয়ংক্রিয় প্রোফাইল তৈরির trigger

### ধাপ ৩: API Keys সংগ্রহ করুন

1. Supabase Dashboard → ⚙️ **Project Settings** → **API**
2. Copy করুন:
   - **Project URL** (যেমন: `https://xxxxx.supabase.co`)
   - **anon / public key** (লম্বা একটা টোকেন)

### ধাপ ৪: `.env` ফাইল তৈরি করুন

প্রজেক্টের root এ (যেখানে `package.json` আছে) `.env` ফাইল বানান:

```
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=আপনার_anon_key_এখানে

REACT_APP_WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/আপনার_group_link
```

⚠️ **`.env` ফাইল কখনো GitHub এ push করবেন না** — `.gitignore` এ এটা আগে থেকেই বাদ দেওয়া আছে।

### ধাপ ৫: Install ও Run করুন

```bash
npm install
npm start
```

`http://localhost:3000` এ ব্রাউজার খুলবে — **Signup** স্ক্রিন দেখবেন।

### ধাপ ৬: নিজের Admin Account বানান

1. App এ গিয়ে নিজের নাম, ইমেইল, পাসওয়ার্ড দিয়ে **Signup** করুন
2. লগইন করুন
3. Supabase Dashboard → **SQL Editor** এ গিয়ে এই কমান্ড চালান (নিজের ইমেইল বসিয়ে):

```sql
update public.profiles set is_admin = true where email = 'আপনার_ইমেইল@gmail.com';
```

4. App refresh করুন — এখন হেডারে একটা 🛡️ Shield আইকন দেখবেন (Admin Panel)

---

## 👥 ৮০ জন সদস্যকে কীভাবে যোগ করবেন

দুইভাবে কাজ করবে:

### A) Admin Pre-load (আপনি করবেন)
1. Admin Panel (🛡️ আইকন) খুলুন
2. প্রতিটা সদস্যের নাম + ইমেইল (এবং চাইলে জেলা/বিশ্ববিদ্যালয় ইত্যাদি) যোগ করুন
3. তারা যখন সেই একই ইমেইল দিয়ে signup করবে, তাদের প্রোফাইল **স্বয়ংক্রিয়ভাবে** পূরণ হয়ে যাবে

### B) Open Signup (সবাই নিজে করবে)
- যে কেউ যেকোনো ইমেইল দিয়ে সরাসরি signup করতে পারবে
- নিজের প্রোফাইল (জেলা, বিশ্ববিদ্যালয়, প্রতিষ্ঠান ইত্যাদি) নিজে পূরণ করবে — Profile Modal এ **Edit** বাটনে চেপে

দুটো একসাথেই চলবে — pre-load না থাকলেও signup করতে কোনো বাধা নেই।

---

## 📱 Features Checklist

- ✅ Real email/password authentication (Supabase Auth)
- ✅ প্রতিটা সদস্যের নিজস্ব account, নিজের প্রোফাইল এডিট করার ক্ষমতা
- ✅ Real-time post feed — যেকোনো ডিভাইস থেকে পোস্ট করলে সবাই সাথে সাথে দেখবে
- ✅ Comments + nested replies
- ✅ Emoji reactions (👍 ❤️ 😂 😮 😢 🔥)
- ✅ Avatar ও post image আপলোড (Supabase Storage)
- ✅ Member directory — search + multi-filter (জেলা/বিশ্ববিদ্যালয়/প্রতিষ্ঠান)
- ✅ CSV export
- ✅ Statistics ড্যাশবোর্ড (bar chart)
- ✅ Admin panel — সদস্য pre-load
- ✅ PWA — installable, offline shell caching
- ✅ Row Level Security — নিজের ডেটা নিজে ছাড়া কেউ বদলাতে পারবে না

---

## 🚀 Vercel এ Deploy করা

```bash
npm install -g vercel
vercel login
vercel
```

Vercel Dashboard → Settings → Environment Variables এ যোগ করুন:
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_WHATSAPP_GROUP_LINK
```

তারপর redeploy করুন।

---

---

## 👤 Admin Panel থেকে সরাসরি ইউজার তৈরি/ডিলিট/ইনভাইট

Admin Panel-এর "নতুন ইউজার" ট্যাব থেকে এখন ৩ ভাবে সদস্য ব্যবস্থাপনা করা যায়:
- **সরাসরি তৈরি** — ইমেইল+পাসওয়ার্ড নিজে বসিয়ে সাথে সাথে একটা কাজ-করা একাউন্ট বানানো (সদস্যকে signup করতে হয় না)
- **ইনভাইট** — শুধু ইমেইল দিলে সেই ঠিকানায় একটা লিংক যায়, সদস্য নিজেই পাসওয়ার্ড ঠিক করে নেন
- **ডিলিট** — "সব সদস্য" ট্যাব থেকে যেকোনো সদস্যের একাউন্ট (নিজেরটা ছাড়া) পুরোপুরি মুছে ফেলা

এই তিনটাই Supabase-এর "Admin API" ব্যবহার করে, যেটার জন্য **service_role key** লাগে — এই key RLS
সম্পূর্ণ বাইপাস করে দেয় বলে এটা কখনোই ব্রাউজারে/ফ্রন্টএন্ড কোডে রাখা যায় না। তাই এই কাজগুলো
`api/admin-create-user.js`, `api/admin-delete-user.js`, `api/admin-invite-user.js` — এই ৩টা
সার্ভারলেস ফাংশনের মাধ্যমে হয় (এগুলো প্রথমে যাচাই করে নেয় রিকোয়েস্ট পাঠানো ব্যক্তি সত্যিই admin
কিনা, তারপরই কাজ করে)।

### সেটআপ (একবারই করতে হবে)

1. Supabase Dashboard → **Project Settings → API** এ যান
2. **service_role** key কপি করুন (⚠️ এটা **anon key** থেকে আলাদা — service_role key কখনো কারো
   সাথে শেয়ার করবেন না, এটা দিয়ে ডাটাবেজের সব কিছু করা যায়)
3. Vercel Dashboard → Settings → Environment Variables এ যোগ করুন:

| নাম | মান |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ধাপ ২ থেকে কপি করা service_role key |

(`REACT_APP_SUPABASE_URL` আগে থেকেই আছে বলে সেটা আবার যোগ করার দরকার নেই — সার্ভারলেস
ফাংশন সেটাই re-use করে।)

4. Redeploy করুন

**⚠️ গুরুত্বপূর্ণ:** এই এনভায়রনমেন্ট ভ্যারিয়েবলের নামের সামনে ভুলেও `REACT_APP_` বসাবেন না —
সেটা করলে key-টা ব্রাউজারের পাবলিক কোডে চলে যাবে, যেটা মারাত্মক নিরাপত্তা ঝুঁকি।

### ডাটাবেজ মাইগ্রেশন (মন্তব্যে রিয়্যাক্ট)

মন্তব্যে (comment) এখন long-press করে রিয়্যাক্ট করা যায় — এর জন্য নতুন একটা টেবিল লাগে।
`supabase/migration_4_comment_reactions.sql` ফাইলটা Supabase SQL Editor-এ Run করুন।

---

## 🔔 পুশ নোটিফিকেশন চালু করা

মন্তব্য/রিয়্যাক্ট/গুরুত্বপূর্ণ আপডেট হলে সদস্যদের ফোনে/ব্রাউজারে সরাসরি নোটিফিকেশন
যাবে — অ্যাপ বন্ধ থাকলেও। এটা সম্পূর্ণ ফ্রি Web Push API দিয়ে বানানো (VAPID key
জোড়া ব্যবহার করে) — কোনো Firebase বা paid সার্ভিস লাগে না।

### ধাপ ১: Supabase মাইগ্রেশন

`supabase/migration_7_push_subscriptions.sql` Supabase SQL Editor-এ Run করুন।

### ধাপ ২: VAPID Key (আগে থেকেই বানানো আছে)

নিচের key জোড়া ব্যবহার করতে পারেন (একবারই বানানো হয়েছে, বদলানোর দরকার নেই):

```
PUBLIC:  BAc7wav9_zP7Lc686g9b6O9--yah5rj_lVMNyOUrSvohJQ5Q1QBi_jhhxXi0vPdebL7IBzEPTTOzGx7qNQ_O1oE
PRIVATE: 1jkNDjT4zur1tXLCTbBLw7WyOv3fzsdpK8Jc_WyZ85g
```

⚠️ PRIVATE key-টা গোপন রাখবেন (শুধু Vercel env var-এ থাকবে, কোথাও শেয়ার করবেন না)।
PUBLIC key ব্রাউজারে যাবে বলে সেটা প্রকাশ্য হলেও সমস্যা নেই।

### ধাপ ৩: Vercel Environment Variables

| নাম | মান |
|---|---|
| `REACT_APP_VAPID_PUBLIC_KEY` | উপরের PUBLIC key |
| `VAPID_PRIVATE_KEY` | উপরের PRIVATE key |

(`NOTIFY_WEBHOOK_SECRET` আর `SUPABASE_SERVICE_ROLE_KEY` আগে থেকেই থাকলে সেগুলো
আবার লাগবে না — না থাকলে "Admin Panel থেকে ইউজার তৈরি" সেকশন দেখুন।)

**@মেনশন নোটিফিকেশনের জন্য** `supabase/migration_11_mentions.sql` টাও Run করতে হবে
(posts/comments টেবিলে mentions কলাম যোগ করে)।

### ধাপ ৪: Supabase Database Webhooks (৪টা)

Supabase Dashboard → **Database → Webhooks** → **Create a new hook** — এই ৪টা টেবিলের
জন্য আলাদা আলাদা করে বানান (প্রতিটার সেটিংস একই রকম, শুধু Table আলাদা):

| Table | Events | Method | URL | Header |
|---|---|---|---|---|
| `posts` | Insert | POST | `https://yourdomain.vercel.app/api/send-push` | `x-webhook-secret: <NOTIFY_WEBHOOK_SECRET এর মান>` |
| `comments` | Insert | POST | একই URL | একই header |
| `reactions` | Insert | POST | একই URL | একই header |
| `important_updates` | Insert | POST | একই URL | একই header |

(`posts` টেবিলের webhook-টা নতুন যোগ হয়েছে — এটা @মেনশন নোটিফিকেশনের জন্য দরকার।
আগে থেকে বাকি ৩টা বানানো থাকলে শুধু এই একটা নতুন করে যোগ করলেই হবে।)

### ব্যবহারকারীরা কীভাবে চালু করবেন

প্রতিটা সদস্য নিজে Settings → নোটিফিকেশন থেকে টগল অন করবেন (ব্রাউজার
অনুমতি চাইবে, "Allow" দিতে হবে)। যিনি টগল অন করেননি, তিনি নোটিফিকেশন পাবেন না।

---

## 🔑 পাসওয়ার্ড রিসেট (ইমেইল) চালু করা

লগইন স্ক্রিনে "পাসওয়ার্ড ভুলে গেছেন?" ফিচারটা কাজ করার জন্য Supabase-কে
জানাতে হবে যে রিসেট লিংকে ক্লিক করলে কোন ঠিকানায় ফিরে আসতে হবে। এটা না
করলে রিসেট ইমেইল যাবে ঠিকই, কিন্তু লিংকে ক্লিক করলে ভুল জায়গায় নিয়ে
যাবে বা এরর দেখাবে।

1. Supabase Dashboard → **Authentication → URL Configuration**-এ যান
2. **Site URL**-এ আপনার আসল ডোমেইন বসান, যেমন: `https://hubbd.vercel.app`
3. **Redirect URLs**-এ যোগ করুন: `https://hubbd.vercel.app/**` (নিজের ডোমেইন অনুযায়ী বদলে নিন)
4. Save করুন

ব্যস, এরপর থেকে লগইন স্ক্রিনে "পাসওয়ার্ড ভুলে গেছেন?" চাপলে যে ইমেইল
যাবে, সেটার লিংকে ক্লিক করলে সরাসরি অ্যাপের "নতুন পাসওয়ার্ড সেট করুন"
স্ক্রিনে চলে আসবে।

**নোট:** ইমেইলের ডিফল্ট টেমপ্লেট Supabase নিজে থেকেই সরবরাহ করে — আলাদা
করে কিছু সেটআপ করা লাগে না, তবে চাইলে Authentication → Email Templates
→ "Reset Password" থেকে ইমেইলের লেখা/ডিজাইন নিজের মতো বদলে নিতে পারবেন।

**ফোন নম্বর দিয়ে (SMS-এ) পাসওয়ার্ড রিসেট** Supabase-এ সম্ভব, কিন্তু এর
জন্য Twilio/Vonage/MessageBird-এর মতো একটা SMS প্রোভাইডার লাগে যেটা
Supabase-এ সরাসরি ফ্রি না — প্রতিটা SMS-এর জন্য টাকা কাটে। তাই এটা যোগ
করা হয়নি; ইমেইল-ভিত্তিক রিসেটই ব্যবহার করা হচ্ছে।

---

## 🐛 সমস্যা সমাধান

| সমস্যা | সমাধান |
|---|---|
| "Profile load error" | schema.sql ঠিকভাবে চালানো হয়েছে কিনা চেক করুন |
| Signup করার পর প্রোফাইল ফাঁকা | এটাই স্বাভাবিক — Profile Modal এ Edit চেপে নিজে পূরণ করতে হবে |
| ছবি আপলোড হচ্ছে না | Supabase Dashboard → Storage এ `avatars`, `post-images` bucket আছে কিনা দেখুন |
| Real-time কাজ করছে না | schema.sql এর `alter publication supabase_realtime add table...` লাইনগুলো ঠিকভাবে চলেছে কিনা চেক করুন |
| Admin Panel দেখাচ্ছে না | `is_admin = true` করার SQL কমান্ড চালিয়েছেন কিনা, এবং app refresh করেছেন কিনা দেখুন |

---

## 🔐 নিরাপত্তা নোট

- Row Level Security (RLS) চালু আছে — প্রতিটা ইউজার শুধু নিজের পোস্ট/কমেন্ট/প্রোফাইল এডিট-ডিলিট করতে পারবে
- সবাই সবার প্রোফাইল ও পোস্ট **দেখতে** পারবে (community platform বলে)
- `anon key` পাবলিক হলেও সমস্যা নেই — RLS policy-ই আসল নিরাপত্তা দেয়
- `.env` ফাইল git এ push হবে না (`.gitignore` এ যোগ করা আছে)

---

**শুভকামনা আকিব ভাই! আলহামদুলিল্লাহ, আপনার প্রজেক্ট এখন একটা সত্যিকারের multi-user platform। 🚀**
