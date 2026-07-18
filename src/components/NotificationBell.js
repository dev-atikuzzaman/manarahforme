import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function NotificationBell({ institutionId, profile }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(profile.last_seen_notifications_at);
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data || []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `institution_id=eq.${institutionId}` }, (payload) => {
        setItems((prev) => [payload.new, ...prev].slice(0, 20));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(payload.new.title, { body: payload.new.message, icon: "/logo192.png" });
          } catch (_) {}
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const unreadCount = items.filter((n) => !lastSeen || new Date(n.created_at) > new Date(lastSeen)).length;

  async function markSeen() {
    const now = new Date().toISOString();
    setLastSeen(now);
    await supabase.from("profiles").update({ last_seen_notifications_at: now }).eq("id", profile.id);
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markSeen(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-gold-500/20 text-gold-400 hover:bg-white/5"
        aria-label="নোটিফিকেশন"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] glass-card rounded-2xl overflow-hidden z-40 anim-in">
            <div className="px-4 py-3 border-b border-gold-500/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-cream/80">নোটিফিকেশন</span>
              {permission !== "granted" && permission !== "unsupported" && (
                <button onClick={requestPermission} className="text-[11px] text-gold-400 hover:text-gold-300">
                  ব্রাউজার নোটিফিকেশন চালু করুন
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && <div className="px-4 py-6 text-center text-cream/40 text-sm">কোনো নোটিফিকেশন নেই।</div>}
              {items.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-gold-500/5 hover:bg-white/5">
                  <div className="text-sm text-cream/90 font-medium">{n.title}</div>
                  <div className="text-xs text-cream/50 mt-0.5">{n.message}</div>
                  <div className="text-[10px] text-cream/30 mt-1">{new Date(n.created_at).toLocaleString("bn-BD")}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
