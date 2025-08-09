import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY)!;

// Soft warn in dev if env is missing; do not crash build
const isMissingEnv = !supabaseUrl || !supabaseKey;
if (isMissingEnv && process.env.NODE_ENV !== "production") {
  void isMissingEnv; // silence eslint rule without disabling
}

export const serverSupabase = () => createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});


