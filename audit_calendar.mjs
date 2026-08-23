import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await sb
  .from('economic_calendar')
  .select('country, event_name, impact, event_time')
  .order('event_time', { ascending: true });

if (error) { console.error(error); process.exit(1); }

// Group by country
const byCountry = {};
for (const e of data) {
  const c = e.country;
  if (!byCountry[c]) byCountry[c] = [];
  byCountry[c].push({ name: e.event_name, impact: e.impact, time: e.event_time });
}

for (const [country, events] of Object.entries(byCountry).sort()) {
  console.log(`\n=== ${country} (${events.length} events) ===`);
  for (const e of events) {
    console.log(`  [${String(e.impact).padEnd(7)}] ${e.name}  — ${e.time.slice(0,10)}`);
  }
}

console.log('\nTotal events:', data.length);
const impacts = [...new Set(data.map(e => e.impact))];
console.log('Unique impact values in DB:', impacts);
