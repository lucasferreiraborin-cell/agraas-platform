import { createClient } from "@supabase/supabase-js";

// Client com service_role — bypassa RLS. Usar apenas em server-side code.
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
