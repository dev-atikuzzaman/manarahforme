import React from "react";

const NAV = [
  { key: "overview", label: "ওভারভিউ", icon: "◈" },
  { key: "students", label: "শিক্ষার্থী/সদস্য", icon: "✎" },
  { key: "attendance", label: "উপস্থিতি ও হিফজ", icon: "✓" },
  { key: "fees", label: "ফি সংগ্রহ", icon: "৳" },
  { key: "hifz", label: "হিফজ প্রগ্রেস", icon: "📈" },
  { key: "results", label: "রেজাল্ট/পরীক্ষা", icon: "🎓" },
  { key: "donations", label: "দান ও যাকাত", icon: "◆" },
  { key: "donors", label: "ডোনার CRM", icon: "🤝" },
  { key: "qurbani", label: "কুরবানি হিসাব", icon: "✦" },
  { key: "accounting", label: "একাউন্টিং", icon: "৳" },
  { key: "payroll", label: "স্টাফ বেতন", icon: "👤" },
  { key: "hostel", label: "আবাসিক/হোস্টেল", icon: "🏠" },
  { key: "notifications", label: "নোটিফিকেশন", icon: "🔔" },
  { key: "reports", label: "রিপোর্ট ও এক্সপোর্ট", icon: "⬇" },
  { key: "members", label: "সদস্য অনুমোদন", icon: "⚑" },
  { key: "subscription", label: "সাবস্ক্রিপশন", icon: "💳" },
  { key: "settings", label: "সেটিংস", icon: "⚙" },
];

export default function Sidebar({
  active, onChange, institutionName, role, onLogout, open, onClose, isPlatformAdmin, onOwnerPanel,
  branches, activeBranchId, homeInstitutionName, onSwitchBranch,
}) {
  const showBranchSwitcher = role === "super_admin" && (branches?.length > 0 || activeBranchId);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-ink-900 border-r border-gold-500/10 flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-6 py-6 border-b border-gold-500/10">
          <div className="font-display text-xl text-gold-400">মানারাহ</div>
          <div className="text-xs text-cream/40 mt-0.5 truncate">{institutionName}</div>
          {activeBranchId && <div className="text-[10px] text-gold-400/70 mt-1">শাখা দেখছেন</div>}
        </div>

        {showBranchSwitcher && (
          <div className="px-3 pt-3">
            <select
              value={activeBranchId || ""}
              onChange={(e) => onSwitchBranch(e.target.value || null)}
              className="w-full bg-ink-800/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-cream/80"
            >
              <option value="">🏠 {homeInstitutionName || "প্রধান প্রতিষ্ঠান"}</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>শাখা: {b.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((n) => {
            if ((n.key === "members" || n.key === "notifications" || n.key === "reports") && role === "viewer") return null;
            if (n.key === "subscription" && role !== "super_admin") return null;
            return (
              <button
                key={n.key}
                onClick={() => { onChange(n.key); onClose && onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  active === n.key
                    ? "bg-gold-500/15 text-gold-300 border border-gold-500/20"
                    : "text-cream/60 hover:bg-white/5 hover:text-cream"
                }`}
              >
                <span className="w-5 text-center">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gold-500/10">
          <div className="px-3 py-1.5 text-[11px] text-cream/35 uppercase tracking-wide">{role}</div>
          {isPlatformAdmin && (
            <button onClick={onOwnerPanel} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gold-400 hover:bg-white/5 transition">
              ✦ মালিক প্যানেল
            </button>
          )}
          <button onClick={onLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-cream/60 hover:bg-white/5 hover:text-red-300 transition">
            লগআউট
          </button>
        </div>
      </aside>
    </>
  );
}
