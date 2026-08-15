import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Notifications({ institutionId, profile, onToast }) {
  const [tab, setTab] = useState("broadcast"); // broadcast | sms | history
  const [history, setHistory] = useState([]);

  // ব্রডকাস্ট ফর্ম
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // SMS ফর্ম
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState({});
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notifications").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }).limit(30);
      setHistory(data || []);
      const { data: st } = await supabase.from("students").select("id, name, phone").eq("institution_id", institutionId).not("phone", "is", null).order("name");
      setStudents((st || []).filter((s) => s.phone));
    })();
  }, [institutionId]);

  async function sendBroadcast(e) {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      institution_id: institutionId,
      title,
      message,
      created_by: profile.id,
    });
    setSending(false);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "নোটিফিকেশন পাঠানো হয়েছে — সবাই রিয়েল-টাইমে দেখবে" });
    setHistory((prev) => [{ id: Date.now(), title, message, created_at: new Date().toISOString() }, ...prev]);
    setTitle(""); setMessage("");
  }

  function toggleSelect(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll() {
    const all = {};
    students.forEach((s) => { all[s.id] = true; });
    setSelected(all);
  }

  async function sendSms(e) {
    e.preventDefault();
    const numbers = students.filter((s) => selected[s.id]).map((s) => s.phone);
    if (numbers.length === 0) return onToast({ type: "error", message: "অন্তত একজন প্রাপক নির্বাচন করুন" });
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers, message: smsMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMS পাঠাতে ব্যর্থ");
      setSmsResult({ ok: true, count: data.sent_to });
      onToast({ message: `${data.sent_to} জনকে SMS পাঠানো হয়েছে` });
      setSmsMessage(""); setSelected({});
    } catch (err) {
      setSmsResult({ ok: false, error: err.message });
      onToast({ type: "error", message: err.message });
    }
    setSmsSending(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("broadcast")} className={`px-4 py-2 rounded-xl text-sm ${tab === "broadcast" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>অ্যাপ নোটিফিকেশন</button>
        <button onClick={() => setTab("sms")} className={`px-4 py-2 rounded-xl text-sm ${tab === "sms" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>SMS পাঠান</button>
        <button onClick={() => setTab("history")} className={`px-4 py-2 rounded-xl text-sm ${tab === "history" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>হিস্টোরি</button>
      </div>

      {tab === "broadcast" && (
        <form onSubmit={sendBroadcast} className="glass-card rounded-2xl p-6 max-w-xl space-y-3">
          <p className="text-xs text-cream/45">প্রতিষ্ঠানের সকল অনুমোদিত সদস্য এটা অ্যাপে সাথে সাথে দেখবে (রিয়েল-টাইম), আর যাদের ব্রাউজার নোটিফিকেশন অনুমতি দেওয়া আছে ও অ্যাপ খোলা আছে তারা ডেস্কটপ নোটিফিকেশনও পাবে।</p>
          <input required placeholder="শিরোনাম" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea required placeholder="বার্তা লিখুন..." rows={3} className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
          <button disabled={sending} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">
            {sending ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </button>
        </form>
      )}

      {tab === "sms" && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 text-xs text-cream/45 leading-relaxed">
            SMS পাঠাতে Vercel-এ <code className="bg-black/30 px-1 rounded">SMS_API_KEY</code> ও <code className="bg-black/30 px-1 rounded">SMS_SENDER_ID</code> এনভায়রনমেন্ট ভ্যারিয়েবল যোগ করতে হবে (bulksmsbd.net বা যেকোনো SMS গেটওয়ে থেকে পাওয়া যায়)। কনফিগার না করা থাকলে নিচের বাটনে এরর দেখাবে।
          </div>
          <form onSubmit={sendSms} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cream/60">প্রাপক নির্বাচন করুন ({Object.values(selected).filter(Boolean).length} জন নির্বাচিত)</span>
              <button type="button" onClick={selectAll} className="text-xs text-gold-400 hover:text-gold-300">সবাইকে নির্বাচন করুন</button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-gold-500/10 rounded-xl divide-y divide-gold-500/5">
              {students.length === 0 && <div className="px-4 py-4 text-sm text-cream/40">ফোন নম্বরসহ কোনো শিক্ষার্থী নেই।</div>}
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-white/5">
                  <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleSelect(s.id)} />
                  <span>{s.name}</span>
                  <span className="text-cream/40 text-xs ml-auto">{s.phone}</span>
                </label>
              ))}
            </div>
            <textarea required placeholder="SMS বার্তা লিখুন..." rows={3} className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} />
            <button disabled={smsSending} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">
              {smsSending ? "পাঠানো হচ্ছে..." : "SMS পাঠান"}
            </button>
            {smsResult && !smsResult.ok && <p className="text-xs text-red-400">{smsResult.error}</p>}
          </form>
        </div>
      )}

      {tab === "history" && (
        <div className="glass-card rounded-2xl divide-y divide-gold-500/5">
          {history.length === 0 && <div className="px-5 py-6 text-center text-cream/40 text-sm">এখনো কোনো নোটিফিকেশন পাঠানো হয়নি।</div>}
          {history.map((n) => (
            <div key={n.id} className="px-5 py-4">
              <div className="text-sm font-medium text-cream/90">{n.title}</div>
              <div className="text-xs text-cream/50 mt-0.5">{n.message}</div>
              <div className="text-xs text-cream/30 mt-1">{new Date(n.created_at).toLocaleString("bn-BD")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
