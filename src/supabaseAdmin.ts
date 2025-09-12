// Garantisce uso solo server (se importato lato client dà errore in build)
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // stessa URL pubblica
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ chiave segreta lato server
  { auth: { persistSession: false } }
);
