import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./components/Landing";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import Overview from "./components/modules/Overview";
import Students from "./components/modules/Students";
import Attendance from "./components/modules/Attendance";
import Donations from "./components/modules/Donations";
import Accounting from "./components/modules/Accounting";
import Qurbani from "./components/modules/Qurbani";
import MemberApprovals from "./components/modules/MemberApprovals";
import Notifications from "./components/modules/Notifications";
import Reports from "./components/modules/Reports";
import Settings from "./components/modules/Settings";
import NotificationBell from "./components/NotificationBell";
import GuardianAuth from "./components/GuardianAuth";
import GuardianPortal from "./components/GuardianPortal";

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showGuardianAuth, setShowGuardianAuth] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [active, setActive] = useState("overview");
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setInstitution(null); setProfileChecked(false); return; }
    setProfileChecked(false);
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(prof || null);
      if (prof?.institution_id) {
        const { data: inst } = await supabase.from("institutions").select("*").eq("id", prof.institution_id).maybeSingle();
        setInstitution(inst || null);
      }
      setProfileChecked(true);
    })();
  }, [session]);

  function showToast(t) {
    setToast(t);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 3000);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setShowAuth(false);
    setShowGuardianAuth(false);
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6 text-center">
        <div className="max-w-md text-cream/60 text-sm">
          ⚠️ Supabase কনফিগার করা নেই। Vercel Project Settings → Environment Variables এ{" "}
          <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_URL</code> ও{" "}
          <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_ANON_KEY</code> বসিয়ে আবার deploy করুন।
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">লোড হচ্ছে...</div>;
  }

  if (!session) {
    if (showGuardianAuth) {
      return <GuardianAuth onLoggedIn={setSession} onBack={() => setShowGuardianAuth(false)} />;
    }
    return showAuth ? (
      <Login onLoggedIn={setSession} />
    ) : (
      <Landing onGetStarted={() => setShowAuth(true)} onGuardianPortal={() => setShowGuardianAuth(true)} />
    );
  }

  if (!profileChecked) {
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">লোড হচ্ছে...</div>;
  }

  if (!profile) {
    return <GuardianPortal onLogout={handleLogout} />;
  }

  if (profile.status === "pending") {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-3xl p-10 max-w-md">
          <div className="font-display text-xl text-gold-400 mb-3">অনুমোদনের অপেক্ষায়</div>
          <p className="text-sm text-cream/50 leading-relaxed mb-6">
            আপনার যোগদানের অনুরোধ প্রতিষ্ঠানের এডমিনের কাছে পাঠানো হয়েছে। অনুমোদন হলেই প্রবেশ করতে পারবেন।
          </p>
          <button onClick={handleLogout} className="text-xs text-cream/50 hover:text-gold-400">লগআউট</button>
        </div>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-3xl p-10 max-w-md">
          <div className="font-display text-xl text-red-300 mb-3">অনুরোধ প্রত্যাখ্যাত হয়েছে</div>
          <p className="text-sm text-cream/50 mb-6">এই প্রতিষ্ঠানের এডমিন আপনার অনুরোধ গ্রহণ করেননি। সঠিক কোড দিয়ে আবার চেষ্টা করুন অথবা এডমিনের সাথে যোগাযোগ করুন।</p>
          <button onClick={handleLogout} className="text-xs text-cream/50 hover:text-gold-400">লগআউট</button>
        </div>
      </div>
    );
  }

  const canEdit = profile.role === "super_admin" || profile.role === "branch_admin";

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade flex">
      <Sidebar
        active={active}
        onChange={setActive}
        institutionName={institution?.name || ""}
        role={profile.role}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gold-500/10">
          <button onClick={() => setSidebarOpen(true)} className="text-gold-400 text-xl md:hidden">☰</button>
          <span className="font-display text-gold-400 md:hidden">মানারাহ</span>
          <span className="hidden md:block" />
          <NotificationBell institutionId={profile.institution_id} profile={profile} />
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {active === "overview" && <Overview institutionId={profile.institution_id} inviteCode={institution?.invite_code} />}
          {active === "students" && <Students institutionId={profile.institution_id} canEdit={canEdit} onToast={showToast} />}
          {active === "attendance" && <Attendance institutionId={profile.institution_id} canEdit={canEdit} onToast={showToast} />}
          {active === "donations" && <Donations institutionId={profile.institution_id} canEdit={canEdit} onToast={showToast} />}
          {active === "qurbani" && <Qurbani institutionId={profile.institution_id} canEdit={canEdit} onToast={showToast} />}
          {active === "accounting" && <Accounting institutionId={profile.institution_id} canEdit={canEdit} onToast={showToast} />}
          {active === "notifications" && canEdit && <Notifications institutionId={profile.institution_id} profile={profile} onToast={showToast} />}
          {active === "reports" && canEdit && <Reports institutionId={profile.institution_id} institutionName={institution?.name} />}
          {active === "members" && canEdit && <MemberApprovals institutionId={profile.institution_id} onToast={showToast} />}
          {active === "settings" && (
            <Settings
              profile={profile}
              institution={institution}
              canEdit={canEdit}
              onInstitutionUpdate={setInstitution}
              onToast={showToast}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
