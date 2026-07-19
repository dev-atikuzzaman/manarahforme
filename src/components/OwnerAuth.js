import React, { useState } from "react";
import { supabase } from "../lib/supabase";

function safeMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string" && error.trim()) return error;
  const msg = error.message || error.error_description || error.msg;
  if (typeof msg === "string" && msg.trim() && msg.trim() !== "{}") return msg;
  try {
    const raw = JSON.stringify(error);
    if (raw && raw !== "{}" && raw !== "null") return `${fallback} [${raw.slice(0, 120)}]`;
  } catch (_) {}
  return fallback;
}

export default function OwnerAuth({ onLoggedIn, onSetupChange, onBack }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setErr(safeMessage(error, "লগইন ব্যর্থ হয়েছে। ইমেইল/পাসওয়ার্ড চেক করুন।"));
      onLoggedIn(data.session);
    } catch (ex) {
      setErr(safeMessage(ex, "লগইন করা যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    onSetupChange?.(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setErr(safeMessage(error, "সাইন আপ ব্যর্থ হয়েছে, আবার চেষ্টা করুন।"));
      if (!data?.user) return setErr("অ্যাকাউন্ট তৈরি করা যায়নি। ইমেইলটা আগে ব্যবহৃত হয়ে থাকতে পারে।");
      if (data.user.identities && data.user.identities.length === 0) {
        return setErr("এই ইমেইল দিয়ে ইতিমধ্যে একটা অ্যাকাউন্ট আছে। নিচে লগইন করুন।");
      }
      if (!data.session) {
        setInfo("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল ভেরিফাই করে লগইন করুন — লগইনের পরই মালিক হিসেবে নিশ্চিত হবে।");
        setMode("login");
        return;
      }

      const { error: claimErr } = await supabase.rpc("claim_first_owner");
      if (claimErr) return setErr(safeMessage(claimErr, "মালিক হিসেবে নিশ্চিত করা যায়নি।"));

      onLoggedIn(data.session);
    } catch (ex) {
      setErr(safeMessage(ex, "সাইন আপ করা যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
      onSetupChange?.(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) return setErr(safeMessage(error, "রিসেট লিংক পাঠানো যায়নি।"));
      setInfo("পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে। ইমেইল চেক করে লিংকে ক্লিক করুন।");
    } catch (ex) {
      setErr(safeMessage(ex, "রিসেট লিংক পাঠানো যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0616] relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute w-96 h-96 bg-violet-700/30 rounded-full blur-[90px] -top-20 -left-20" />
      <div className="absolute w-[28rem] h-[28rem] bg-fuchsia-800/20 rounded-full blur-[100px] top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-md rounded-3xl p-8 anim-in bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-violet-400/25 backdrop-blur">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-violet-300 bg-violet-500/15 border border-violet-400/30 rounded-full px-3 py-1 mb-3">
            🔒 সীমিত অ্যাক্সেস
          </div>
          <div className="text-2xl font-display text-violet-200">মানারাহ প্ল্যাটফর্ম</div>
          <div className="text-cream/40 text-sm mt-1">এটা সাধারণ প্রতিষ্ঠান/স্টাফ লগইন না — এটা পুরো অ্যাপের মালিকের প্যানেল।</div>
        </div>

        {err && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm break-words">{err}</div>}
        {info && <div className="mb-4 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-400/30 text-violet-200 text-sm">{info}</div>}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input className="w-full bg-black/30 border border-violet-400/25 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="মালিকের ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full bg-black/30 border border-violet-400/25 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl py-2.5 transition disabled:opacity-50">
              {busy ? "..." : "মালিক হিসেবে লগইন করুন"}
            </button>
            <div className="flex justify-between text-xs text-cream/40 pt-2">
              <button type="button" onClick={() => setMode("forgot")} className="hover:text-violet-300">পাসওয়ার্ড ভুলে গেছেন?</button>
              <button type="button" onClick={() => setMode("signup")} className="hover:text-violet-300">প্রথম মালিক হিসেবে সাইন-আপ</button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3">
            <p className="text-[11px] text-cream/35">এই সাইন-আপ শুধু তখনই কাজ করবে যদি এখনো কোনো মালিক নির্ধারিত না হয়ে থাকে — একবার কেউ মালিক হয়ে গেলে এটা আর কারো জন্য কাজ করবে না।</p>
            <input className="w-full bg-black/30 border border-violet-400/25 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full bg-black/30 border border-violet-400/25 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড (৬+ ক্যারেক্টার)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl py-2.5 transition disabled:opacity-50">
              {busy ? "..." : "মালিক হিসেবে সাইন-আপ করুন"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-cream/40 hover:text-violet-300 pt-1">← লগইনে ফিরুন</button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-[11px] text-cream/35">ইমেইল দাও, রিসেট লিংক পাঠানো হবে।</p>
            <input className="w-full bg-black/30 border border-violet-400/25 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="মালিকের ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button disabled={busy} className="w-full bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl py-2.5 transition disabled:opacity-50">
              {busy ? "..." : "রিসেট লিংক পাঠান"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-cream/40 hover:text-violet-300 pt-1">← লগইনে ফিরুন</button>
          </form>
        )}

        <button onClick={onBack} className="w-full text-center text-xs text-cream/25 hover:text-cream/45 pt-5">← হোমপেজে ফিরুন</button>
      </div>
    </div>
  );
}
