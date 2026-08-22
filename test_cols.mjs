import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida en .env'); process.exit(1); }
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('signals_pro_data').select('fake_column').limit(1);
  if (error) console.error(error);
  else console.log(data);
}
run();
