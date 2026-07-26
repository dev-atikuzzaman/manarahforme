import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const TILES = [
  { key: "students", label: "শিক্ষার্থী/সদস্য", icon: "✎", desc: "ভর্তি, তথ্য, পোর্টাল কোড" },
  { key: "attendance", label: "উপস্থিতি ও হিফজ", icon: "✓", desc: "দৈনিক হাজিরা, অগ্রগতি" },
  { key: "fees", label: "ফি সংগ্রহ", icon: "৳", desc: "মাসিক ফি ট্র্যাকিং, বকেয়া" },
  { key: "hifz", label: "হিফজ প্রগ্রেস", icon: "📈", desc: "অগ্রগতির চার্ট, লিডারবোর্ড" },
  { key: "results", label: "রেজাল্ট/পরীক্ষা", icon: "🎓", desc: "নম্বর, গ্রেড, মেধাক্রম, রেজাল্ট কার্ড" },
  { key: "donations", label: "দান ও যাকাত", icon: "◆", desc: "দান রেকর্ড, নিসাব হিসাব" },
  { key: "donors", label: "ডোনার CRM", icon: "🤝", desc: "দাতার ইতিহাস, ফলো-আপ, প্রবণতা" },
  { key: "qurbani", label: "কুরবানি হিসাব", icon: "✦", desc: "ভাগ বণ্টন, মাংস বিতরণ" },
  { key: "accounting", label: "একাউন্টিং", icon: "৳", desc: "আয়-ব্যয়, মাসিক ট্রেন্ড" },
  { key: "payroll", label: "স্টাফ বেতন", icon: "👤", desc: "স্টাফ তালিকা, বেতন প্রদান" },
  { key: "hostel", label: "আবাসিক/হোস্টেল", icon: "🏠", desc: "রুম, মিল হিসাব, বোর্ডিং ফি" },
  { key: "notifications", label: "নোটিফিকেশন", icon: "🔔", desc: "ব্রডকাস্ট, SMS", adminOnly: true },
  { key: "reports", label: "রিপোর্ট ও এক্সপোর্ট", icon: "⬇", desc: "PDF/Excel ডাউনলোড", adminOnly: true },
  { key: "members", label: "সদস্য অনুমোদন", icon: "⚑", desc: "স্টাফ যোগদান অনুমোদন", adminOnly: true },
  { key: "settings", label: "সেটিংস", icon: "⚙", desc: "প্রতিষ্ঠান, লোগো, প্রোফাইল" },
];

export default function Overview({ institutionId, inviteCode, onNavigate, canEdit }) {
  const [stats, setStats] = useState({ students: 0, presentToday: 0, donationsTotal: 0, pending: 0 });

  async function load() {
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: students }, { count: presentToday }, { data: donations }, { count: pending }] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("institution_id", institutionId).eq("date", today).eq("status", "present"),
      supabase.from("donations").select("amount").eq("institution_id", institutionId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("institution_id", institutionId).eq("status", "pending"),
    ]);
    const donationsTotal = (donations || []).reduce((s, d) => s + Number(d.amount || 0), 0);
    setStats({ students: students || 0, presentToday: presentToday || 0, donationsTotal, pending: pending || 0 });
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("overview-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `institution_id=eq.${institutionId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "donations", filter: `institution_id=eq.${institutionId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const cards = [
    { label: "মোট শিক্ষার্থী/সদস্য", value: stats.students },
    { label: "আজ উপস্থিত", value: stats.presentToday },
    { label: "মোট দান সংগৃহীত", value: `৳${stats.donationsTotal.toLocaleString("bn-BD")}` },
    { label: "অনুমোদনের অপেক্ষায়", value: stats.pending },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-5">
            <div className="text-cream/40 text-xs mb-2">{c.label}</div>
            <div className="text-2xl font-display text-gold-400">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="text-sm text-cream/60 mb-2">সদস্য আমন্ত্রণ কোড</div>
        <div className="flex items-center gap-3">
          <code className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-3 py-1.5 text-gold-300 tracking-widest">{inviteCode}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(inviteCode); }}
            className="text-xs text-cream/50 hover:text-gold-400"
          >
            কপি করুন
          </button>
        </div>
        <p className="text-xs text-cream/40 mt-2">নতুন এডমিন/ভিউয়ারকে এই কোড দিন — লগইন স্ক্রিনে "কোড দিয়ে যোগ দিন" থেকে যোগ দেবে, এরপর "সদস্য অনুমোদন" ট্যাবে অনুমোদন দিন।</p>
      </div>

      <div>
        <div className="text-sm text-cream/50 mb-3">সব ফিচার — এক জায়গায়</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.filter((t) => !t.adminOnly || canEdit).map((t) => (
            <button
              key={t.key}
              onClick={() => onNavigate?.(t.key)}
              className="glass-card rounded-2xl p-5 text-left hover:border-gold-500/30 hover:bg-white/5 transition group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 group-hover:bg-gold-500/20">
                  {t.icon}
                </span>
                <span className="font-medium text-cream/90">{t.label}</span>
              </div>
              <div className="text-xs text-cream/40">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
