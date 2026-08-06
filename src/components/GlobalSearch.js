import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIES = [
  { key: "students", label: "শিক্ষার্থী/সদস্য", icon: "✎", tab: "students" },
  { key: "staff", label: "স্টাফ", icon: "👤", tab: "payroll" },
  { key: "donors", label: "দাতা", icon: "🤝", tab: "donors" },
  { key: "exams", label: "পরীক্ষা", icon: "🎓", tab: "results" },
];

export default function GlobalSearch({ institutionId, onNavigate, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults({});
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query.trim()), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(q) {
    setLoading(true);
    const like = `%${q}%`;
    const [students, staff, donors, exams] = await Promise.all([
      supabase.from("students").select("id, name, class_name, phone, guardian_name")
        .eq("institution_id", institutionId)
        .or(`name.ilike.${like},phone.ilike.${like},guardian_name.ilike.${like},class_name.ilike.${like}`)
        .limit(6),
      supabase.from("staff").select("id, name, designation, phone")
        .eq("institution_id", institutionId)
        .or(`name.ilike.${like},designation.ilike.${like},phone.ilike.${like}`)
        .limit(6),
      supabase.from("donors").select("id, name, phone")
        .eq("institution_id", institutionId)
        .or(`name.ilike.${like},phone.ilike.${like}`)
        .limit(6),
      supabase.from("exams").select("id, name, class_name")
        .eq("institution_id", institutionId)
        .or(`name.ilike.${like},class_name.ilike.${like}`)
        .limit(6),
    ]);

    setResults({
      students: students.data || [],
      staff: staff.data || [],
      donors: donors.data || [],
      exams: exams.data || [],
    });
    setLoading(false);
  }

  const totalCount = Object.values(results).reduce((s, arr) => s + (arr?.length || 0), 0);

  function goTo(tab) {
    onNavigate(tab);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div className="glass-card rounded-3xl w-full max-w-lg overflow-hidden anim-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gold-500/10">
          <span className="text-gold-400">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="শিক্ষার্থী, স্টাফ, দাতা, পরীক্ষা খুঁজুন..."
            className="flex-1 bg-transparent text-sm text-cream placeholder:text-cream/30 outline-none"
          />
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-sm">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {query.trim().length < 2 && (
            <div className="px-5 py-8 text-center text-cream/35 text-sm">অন্তত ২ অক্ষর লিখুন খোঁজা শুরু করতে</div>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="px-5 py-8 text-center text-cream/35 text-sm">খোঁজা হচ্ছে...</div>
          )}
          {query.trim().length >= 2 && !loading && totalCount === 0 && (
            <div className="px-5 py-8 text-center text-cream/35 text-sm">কোনো ফলাফল পাওয়া যায়নি।</div>
          )}

          {!loading && CATEGORIES.map((cat) => {
            const items = results[cat.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat.key} className="border-b border-gold-500/5 last:border-0">
                <div className="px-5 pt-3 pb-1 text-xs text-cream/35 flex items-center gap-1.5">
                  <span>{cat.icon}</span>{cat.label}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goTo(cat.tab)}
                    className="w-full text-left px-5 py-2.5 hover:bg-white/5 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-cream/90">{item.name}</span>
                    <span className="text-xs text-cream/35 truncate max-w-[45%]">
                      {[item.class_name, item.designation, item.phone].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
