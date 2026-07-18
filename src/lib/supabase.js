import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

// url/key না থাকলে supabase হবে null — App.js এটা ধরে ইউজারকে সতর্ক করে,
// পুরো অ্যাপ ক্র্যাশ করে না। Vercel-এ Environment Variables সেট করলেই এটা কাজ করবে।
export const supabase = url && key ? createClient(url, key) : null;
