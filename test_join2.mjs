import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida en .env'); process.exit(1); }
const supabase = createClient(url, key);

async function run() {
  const { data: res1, error: err1 } = await supabase.from('signals').insert({ signal_key: 'shape-test-001', asset: 'TEST', direction: 'LONG', status: 'active' }).select();
  if (err1) console.error("ERR1", err1);
  const sig_id = res1[0].id;
  const { error: err2 } = await supabase.from('signals_pro_data').insert({ signal_id: sig_id, entry_price: 100.5, stop_loss: 90.0, take_profit_1: 110.0, score: 50, confluences: ['test'] });
  if (err2) console.error("ERR2", err2);
  
  const { data: joined, error: err3 } = await supabase.from('signals').select('asset, direction, signals_pro_data(entry_price, stop_loss, take_profit_1)').eq('signal_key', 'shape-test-001');
  if (err3) console.error("ERR3", err3);
  
  console.log('\n--- FORMA DEL OBJETO DEVUELTO ---');
  console.log(JSON.stringify(joined, null, 2));
  console.log('---------------------------------\n');
  
  await supabase.from('signals').delete().eq('signal_key', 'shape-test-001');
}
run();
