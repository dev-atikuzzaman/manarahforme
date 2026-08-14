import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./components/Landing";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import Overview from "./components/modules/Overview";
import Students from "./components/modules/Students";
import Attendance from "./components/modules/Attendance";
import FeeCollection from "./components/modules/FeeCollection";
import HifzProgress from "./components/modules/HifzProgress";
import Results from "./components/modules/Results";
import Donations from "./components/modules/Donations";
import Donors from "./components/modules/Donors";
import Accounting from "./components/modules/Accounting";
import Payroll from "./components/modules/Payroll";
import Hostel from "./components/modules/Hostel";
import Qurbani from "./components/modules/Qurbani";
import MemberApprovals from "./components/modules/MemberApprovals";
import Notifications from "./components/modules/Notifications";
import Reports from "./components/modules/Reports";
import Settings from "./components/modules/Settings";
import DisplayPreferences from "./components/DisplayPreferences";
import SubscriptionPayment from "./components/modules/SubscriptionPayment";
import NotificationBell from "./components/NotificationBell";
import GuardianAuth from "./components/GuardianAuth";
import CompleteSetup from "./components/CompleteSetup";
import GuardianPortal from "./components/GuardianPortal";
import OwnerDashboard from "./components/OwnerDashboard";
import OwnerAuth from "./components/OwnerAuth";
import ResetPassword from "./components/ResetPassword";
import DateWidget from "./components/DateWidget";
import GlobalSearch from "./components/GlobalSearch";

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showGuardianAuth, setShowGuardianAuth] = useState(false);
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [pendingSetup, setPendingSetup] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchesTick, setBranchesTick] = useState(0);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [ownerMode, setOwnerMode] = useState(false);
  const [guardianLinkCount, setGuardianLinkCount] = useState(null);
  const [forceGuardianView, setForceGuardianView] = useState(false);
  const [active, setActive] = useState("overview");
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ব্যাক বাটন চাপলে সরাসরি অ্যাপ থেকে বের হয়ে না গিয়ে আগের ট্যাবে (বা আগের শাখায়) ফিরে যাক —
  // এজন্য প্রতিটা ট্যাব-বদল/শাখা-বদল ব্রাউজার হিস্ট্রিতে একটা এন্ট্রি যোগ করে, আর ব্যাক বাটনে
  // (popstate) সেই এন্ট্রি অনুযায়ী state ফিরিয়ে আনা হয়, পুরো অ্যাপ আনমাউন্ট হয় না।
  function navigate(tab) {
    if (tab === active) return;
    window.history.pushState({ manarahTab: tab, manarahBranch: activeBranchId }, "", `#${tab}`);
    setActive(tab);
  }

  function switchBranch(branchId) {
    if (branchId === activeBranchId) return;
    window.history.pushState({ manarahTab: active, manarahBranch: branchId }, "", `#${active}`);
    setActiveBranchId(branchId);
  }

  useEffect(() => {
    function handlePopState(e) {
      setActive(e.state?.manarahTab || "overview");
      setActiveBranchId(e.state?.manarahBranch || null);
    }
    window.history.replaceState({ manarahTab: "overview", manarahBranch: null }, "", "#overview");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setInstitution(null); setProfileChecked(false); setIsPlatformAdmin(false); setGuardianLinkCount(null); return; }
    setProfileChecked(false);
    (async () => {
      const [profRes, ownerRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("platform_admins").select("id").eq("id", session.user.id).maybeSingle(),
      ]);
      if (profRes.error) console.warn("profiles lookup:", profRes.error);
      if (ownerRes.error) console.warn("platform_admins lookup (migration 5 লাগানো হয়েছে কি?):", ownerRes.error);

      setProfile(profRes.data || null);
      setIsPlatformAdmin(!!ownerRes.data);
      setOwnerMode(!!ownerRes.data);

      if (profRes.data?.institution_id) {
        const { data: inst } = await supabase.from("institutions").select("*").eq("id", profRes.data.institution_id).maybeSingle();
        setInstitution(inst || null);
      }

      if (!profRes.data && !ownerRes.data) {
        const { count } = await supabase.from("guardian_links").select("id", { count: "exact", head: true });
        setGuardianLinkCount(count || 0);
      }

      setProfileChecked(true);
    })();
  }, [session, refreshTick]);

  useEffect(() => {
    if (!institution?.id || profile?.role !== "super_admin") { setBranches([]); return; }
    (async () => {
      const { data } = await supabase.from("institutions").select("*").eq("parent_institution_id", institution.id).order("created_at");
      setBranches(data || []);
    })();
  }, [institution?.id, profile?.role, branchesTick]);

  // signUp() নিজেই একটা সেশন তৈরি করে ফেলে, যার ফলে global auth listener সাথে সাথে ফায়ার হয় —
  // কিন্তু ততক্ষণে Login/OwnerAuth/GuardianAuth হয়তো এখনো institution/profile/owner তৈরি করছে।
  // pendingSetup সত্যি থাকা অবস্থায় App.js এই "মাঝপথের" সেশন দেখে আগেভাগে ড্যাশবোর্ড/গার্ডিয়ান
  // স্ক্রিনে চলে যায় না — auth ফর্মটাই মাউন্ট করা থাকে যতক্ষণ না পুরো সেটআপ শেষ হয়।
  function handleLoggedIn(newSession) {
    setPendingSetup(false);
    setSession(newSession);
    setRefreshTick((t) => t + 1);
  }

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
    setShowOwnerAuth(false);
    setForceGuardianView(false);
    setPendingSetup(false);
    setPasswordRecovery(false);
    setActiveBranchId(null);
    setActive("overview");
    window.history.replaceState({ manarahTab: "overview", manarahBranch: null }, "", "#overview");
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

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />;
  }

  if (!session || pendingSetup) {
    if (showGuardianAuth) {
      return <GuardianAuth onLoggedIn={handleLoggedIn} onSetupChange={setPendingSetup} onBack={() => setShowGuardianAuth(false)} />;
    }
    if (showOwnerAuth) {
      return <OwnerAuth onLoggedIn={handleLoggedIn} onSetupChange={setPendingSetup} onBack={() => setShowOwnerAuth(false)} />;
    }
    return showAuth ? (
      <Login onLoggedIn={handleLoggedIn} onSetupChange={setPendingSetup} />
    ) : (
      <Landing
        onGetStarted={() => setShowAuth(true)}
        onGuardianPortal={() => setShowGuardianAuth(true)}
        onOwnerPortal={() => setShowOwnerAuth(true)}
      />
    );
  }

  if (!profileChecked) {
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">লোড হচ্ছে...</div>;
  }

  if (isPlatformAdmin && ownerMode) {
    return (
      <OwnerDashboard
        hasOwnInstitution={!!profile}
        onSwitchToInstitution={() => setOwnerMode(false)}
        onLogout={handleLogout}
      />
    );
  }

  if (!profile) {
    if (guardianLinkCount === null) {
      return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">লোড হচ্ছে...</div>;
    }
    if (guardianLinkCount > 0 || forceGuardianView) {
      return <GuardianPortal onLogout={handleLogout} />;
    }
    // কোনো profiles/platform_admins/guardian_links রো নেই — যেমনটা হয় যখন কেউ
    // লগইন পেজ থেকে সরাসরি Google দিয়ে ঢুকে ফেলে, প্রতিষ্ঠান তৈরি/জয়েন না করেই।
    // আগে এখানে একটা ডেড-এন্ড এরর কার্ড দেখানো হতো — এখন সরাসরি সেটআপ করার সুযোগ দেওয়া হয়।
    return (
      <CompleteSetup
        session={session}
        onGuardianPortal={() => setForceGuardianView(true)}
        onLogout={handleLogout}
        onDone={(msg) => {
          showToast({ message: msg });
          setRefreshTick((t) => t + 1);
        }}
      />
    );
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

  const trialExpired =
    institution?.trial_ends_at &&
    (institution.plan_status === "trial" || !institution.plan_status) &&
    new Date(institution.trial_ends_at) < new Date();

  if (!isPlatformAdmin && institution && (institution.plan_status === "suspended" || trialExpired)) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-3xl p-10 max-w-md">
          <div className="font-display text-xl text-red-300 mb-3">
            {institution.plan_status === "suspended" ? "প্রতিষ্ঠান সাময়িকভাবে স্থগিত" : "ট্রায়াল মেয়াদ শেষ"}
          </div>
          <p className="text-sm text-cream/50 leading-relaxed mb-6">
            {institution.plan_status === "suspended"
              ? "এই প্রতিষ্ঠানের অ্যাক্সেস সাময়িকভাবে বন্ধ করা হয়েছে। বিস্তারিত জানতে সেবা প্রদানকারীর সাথে যোগাযোগ করুন।"
              : "আপনার ফ্রি ট্রায়ালের মেয়াদ শেষ হয়ে গেছে। চালিয়ে যেতে সাবস্ক্রিপশন সক্রিয় করতে হবে — সেবা প্রদানকারীর সাথে যোগাযোগ করুন।"}
          </p>
          <button onClick={handleLogout} className="text-xs text-cream/50 hover:text-gold-400">লগআউট</button>
        </div>
      </div>
    );
  }

  const canEdit = profile.role === "super_admin" || profile.role === "branch_admin";
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;
  const viewInstitution = activeBranch || institution;

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade flex">
      <Sidebar
        active={active}
        onChange={navigate}
        institutionName={viewInstitution?.name || ""}
        role={profile.role}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isPlatformAdmin={isPlatformAdmin}
        onOwnerPanel={() => setOwnerMode(true)}
        branches={branches}
        activeBranchId={activeBranchId}
        homeInstitutionName={institution?.name}
        onSwitchBranch={switchBranch}
      />

      <div className="flex-1 min-w-0">
        <div className="border-b border-gold-500/10">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="text-gold-400 text-xl md:hidden shrink-0">☰</button>
              <span className="font-display text-gold-400 md:hidden truncate">মানারাহ</span>
              <div className="hidden md:block min-w-0">
                <DateWidget compact />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setSearchOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-full border border-gold-500/20 text-gold-400 hover:bg-white/5" aria-label="খুঁজুন">
                🔍
              </button>
              <NotificationBell institutionId={viewInstitution?.id} profile={profile} />
            </div>
          </div>
          <div className="md:hidden px-4 pb-3 -mt-1 overflow-x-auto">
            <DateWidget compact />
          </div>
        </div>

        {searchOpen && (
          <GlobalSearch institutionId={viewInstitution?.id} onNavigate={navigate} onClose={() => setSearchOpen(false)} />
        )}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {active === "overview" && <Overview institutionId={viewInstitution?.id} inviteCode={viewInstitution?.invite_code} onNavigate={navigate} canEdit={canEdit} />}
          {active === "students" && <Students institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "attendance" && <Attendance institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "fees" && <FeeCollection institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "hifz" && <HifzProgress institutionId={viewInstitution?.id} />}
          {active === "results" && <Results institutionId={viewInstitution?.id} institutionName={viewInstitution?.name} canEdit={canEdit} onToast={showToast} />}
          {active === "donations" && <Donations institutionId={viewInstitution?.id} institutionName={viewInstitution?.name} canEdit={canEdit} onToast={showToast} />}
          {active === "donors" && <Donors institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "qurbani" && <Qurbani institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "accounting" && <Accounting institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "payroll" && <Payroll institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "hostel" && <Hostel institutionId={viewInstitution?.id} canEdit={canEdit} onToast={showToast} />}
          {active === "notifications" && canEdit && <Notifications institutionId={viewInstitution?.id} profile={profile} onToast={showToast} />}
          {active === "reports" && canEdit && <Reports institutionId={viewInstitution?.id} institutionName={viewInstitution?.name} />}
          {active === "members" && canEdit && <MemberApprovals institutionId={viewInstitution?.id} onToast={showToast} />}
          {active === "subscription" && institution && (
            <SubscriptionPayment institution={institution} profile={profile} onToast={showToast} />
          )}
          {active === "display" && <DisplayPreferences />}
          {active === "settings" && (
            <Settings
              profile={profile}
              institution={viewInstitution}
              canEdit={canEdit}
              onInstitutionUpdate={activeBranch ? (updated) => setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b))) : setInstitution}
              onToast={showToast}
              onLogout={handleLogout}
              branches={!activeBranch ? branches : null}
              homeInstitutionId={institution?.id}
              onBranchCreated={() => setBranchesTick((t) => t + 1)}
              onSwitchBranch={switchBranch}
            />
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
