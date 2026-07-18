import React from "react";

const FEATURES = [
  { title: "উপস্থিতি ও হিফজ ট্র্যাকিং", desc: "প্রতিদিনের হাজিরা ও হিফজ অগ্রগতি এক ট্যাপে রেকর্ড হবে, রিয়েল-টাইমে সবাই দেখবে।" },
  { title: "ফি ও একাউন্টিং", desc: "মাসিক ফি, বকেয়া রিমাইন্ডার আর আয়-ব্যয়ের হিসাব — সব এক জায়গায় স্বচ্ছভাবে।" },
  { title: "দান ও যাকাত", desc: "দাতাদের হিস্ট্রি, স্বয়ংক্রিয় নিসাব হিসাব আর ডিজিটাল রশিদ — বিশ্বস্ততা বাড়ায়।" },
  { title: "কুরবানি ভাগ ব্যবস্থাপনা", desc: "ভাগ বণ্টন, পেমেন্ট ট্র্যাকিং আর মাংস বিতরণের তালিকা — কুরবানির মৌসুমে ঝামেলামুক্ত।" },
  { title: "মাল্টি-শাখা রোল এক্সেস", desc: "সুপার এডমিন, শাখা এডমিন ও ভিউয়ার — প্রতিটি ভূমিকার জন্য আলাদা এক্সেস।" },
  { title: "অফলাইন PWA", desc: "ইন্টারনেট না থাকলেও অ্যাপ খোলা যাবে, সংযোগ ফিরলেই ডাটা সিঙ্ক হয়ে যাবে।" },
];

const PREMIUM = [
  "একজন সুপার এডমিন থেকে একাধিক মসজিদ/মাদ্রাসা মনিটর করার ড্যাশবোর্ড",
  "অভিভাবক ও দাতাদের জন্য আলাদা পোর্টাল — নিজ সন্তান বা নিজের দানের হিসাব দেখার সুযোগ",
  "লাইভ ড্যাশবোর্ড — আজকের উপস্থিতি ও কালেকশন রিয়েল-টাইমে",
  "হিফজ অগ্রগতির ভিজ্যুয়াল চার্ট ও রিপোর্ট এক্সপোর্ট (PDF/Excel)",
];

export default function Landing({ onGetStarted, onGuardianPortal }) {
  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-x-hidden text-cream">
      <div className="blob w-96 h-96 bg-gold-500 -top-24 -left-24" />
      <div className="blob w-[30rem] h-[30rem] bg-ink-600 top-1/4 -right-40" />
      <div className="blob w-72 h-72 bg-emerald-700 bottom-0 left-1/3" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
          <div className="font-display text-xl text-gold-400">মানারাহ.</div>
          <div className="hidden md:flex items-center gap-8 text-sm text-cream/70">
            <a href="#home" className="text-gold-400">হোম</a>
            <a href="#features" className="hover:text-gold-300">ফিচার</a>
            <a href="#premium" className="hover:text-gold-300">প্রিমিয়াম</a>
            <a href="#reviews" className="hover:text-gold-300">রিভিউ</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onGuardianPortal} className="hidden sm:block text-xs text-cream/50 hover:text-gold-300 transition">
              অভিভাবক পোর্টাল
            </button>
            <button onClick={onGetStarted} className="text-sm bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-full transition">
              লগইন
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section id="home" className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="anim-in">
            <h1 className="font-display text-4xl md:text-5xl leading-tight mb-5">
              আপনার <span className="text-gold-400">মসজিদ ও মাদ্রাসা</span> চলুক
              <br /> পুরোপুরি <span className="text-gold-400">ডিজিটাল</span> ও স্বচ্ছভাবে
            </h1>
            <p className="text-cream/60 leading-relaxed mb-8 max-w-md">
              শিক্ষার্থী, উপস্থিতি, ফি, দান আর যাকাত — খাতা-কলম বাদ দিয়ে এক অ্যাপে,
              রিয়েল-টাইম সিঙ্ক সহ। কোনো সুদ, কোনো অস্বচ্ছতা নেই — সম্পূর্ণ শরীয়াহসম্মত।
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <button onClick={onGetStarted} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-6 py-3 rounded-full shadow-glow transition">
                বিনামূল্যে শুরু করুন →
              </button>
              <a href="#features" className="border border-gold-500/40 hover:border-gold-400 px-6 py-3 rounded-full text-sm text-cream/80 transition">
                ফিচার দেখুন
              </a>
            </div>
            <p className="text-xs text-cream/40">৩০ দিন ফ্রি ট্রায়াল পাবেন, কোনো কার্ড লাগবে না।</p>
          </div>

          {/* Signature visual: mosque-arch frame with a minaret illustration */}
          <div className="anim-in flex justify-center">
            <div className="arch-frame w-full max-w-sm aspect-[4/5] bg-ink-800 flex items-end justify-center">
              <svg viewBox="0 0 200 260" className="w-3/4 h-3/4" fill="none">
                <circle cx="150" cy="40" r="14" fill="#ffcf5c" opacity="0.85" />
                <path d="M100 20 L112 60 L88 60 Z" fill="#f5b400" />
                <rect x="90" y="60" width="20" height="70" fill="#1a4d35" />
                <path d="M85 130 Q100 100 115 130 L115 170 L85 170 Z" fill="#123a28" />
                <rect x="60" y="170" width="80" height="70" fill="#0c2b1e" stroke="#f5b400" strokeOpacity="0.3" />
                <path d="M60 170 Q100 130 140 170" stroke="#f5b400" strokeOpacity="0.5" strokeWidth="2" fill="none" />
                <rect x="20" y="90" width="14" height="150" fill="#123a28" />
                <path d="M15 90 Q27 70 39 90" fill="#123a28" />
                <rect x="166" y="90" width="14" height="150" fill="#123a28" />
                <path d="M161 90 Q173 70 185 90" fill="#123a28" />
              </svg>
            </div>
          </div>
        </section>

        <div className="motif-divider max-w-6xl mx-auto px-6 text-xs pb-2">
          <span>যা যা থাকছে</span>
        </div>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card rounded-2xl p-6 anim-in">
              <div className="text-gold-400 mb-2 text-lg">✦</div>
              <div className="font-semibold mb-1.5">{f.title}</div>
              <div className="text-sm text-cream/55 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </section>

        {/* Premium comparison */}
        <section id="premium" className="max-w-6xl mx-auto px-6 py-14">
          <div className="glass-card rounded-3xl p-8 md:p-12">
            <div className="font-display text-2xl text-gold-400 mb-2">প্রিমিয়াম — সাধারণ মাদ্রাসা সফটওয়্যারের চেয়ে এক ধাপ এগিয়ে</div>
            <p className="text-cream/50 text-sm mb-8 max-w-2xl">
              প্রচলিত সফটওয়্যারে সাধারণত হাজিরা, রেজাল্ট ও একাউন্টিং থাকে। মানারাহ-তে সেগুলোর পাশাপাশি
              আরও যা থাকছে:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {PREMIUM.map((p) => (
                <div key={p} className="flex gap-3 items-start">
                  <span className="text-gold-400 mt-0.5">◆</span>
                  <span className="text-sm text-cream/75 leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-cream/40 border-t border-gold-500/10">
          <span>© মানারাহ — মসজিদ ও মাদ্রাসার জন্য তৈরি</span>
          <span>শতভাগ শরীয়াহ্‌সম্মত, সুদমুক্ত সাবস্ক্রিপশন মডেল</span>
        </footer>
      </div>
    </div>
  );
}
