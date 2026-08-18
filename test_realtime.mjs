import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Usamos las variables del frontend de AEON
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan credenciales de Supabase en el .env");
  process.exit(1);
}

// 1. Conexión a Supabase estrictamente con ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Iniciando prueba de Realtime...");
  console.log("1. Autenticando como Usuario PRO (test4d_pro@aeon.test)...");
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test4d_pro@aeon.test',
    password: 'aeonRealtime4D!'
  });

  if (authError) {
    console.error("❌ Error de autenticación:", authError.message);
    process.exit(1);
  }

  console.log("✅ Autenticado exitosamente. Perfil PRO activo.");
  console.log("\n2. Suscribiéndose a canales de Realtime...");

  let receivedSignals = false;
  let receivedProData = false;

  const channelPublic = supabase.channel('public:signals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
      const now = new Date().toISOString();
      console.log(`\n[${now}] 🟢 EVENTO REALTIME -> signals:`);
      console.log(`   ➔ Activo: ${payload.new.asset} | Dirección: ${payload.new.direction}`);
      console.log(`   ➔ signal_id: ${payload.new.id}`);
      receivedSignals = true;
      checkCompletion();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("   ✅ Escuchando la tabla pública: signals");
      }
    });

  const channelPro = supabase.channel('public:signals_pro_data')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals_pro_data' }, (payload) => {
      const now = new Date().toISOString();
      console.log(`\n[${now}] 🟡 EVENTO REALTIME -> signals_pro_data:`);
      console.log(`   ➔ Entrada: ${payload.new.entry_price} | SL: ${payload.new.stop_loss}`);
      console.log(`   ➔ signal_id: ${payload.new.signal_id}`);
      receivedProData = true;
      checkCompletion();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("   ✅ Escuchando la tabla privada: signals_pro_data");
      }
    });

  console.log("\n⏳ Terminal falsa activa. Esperando recibir una señal del bot de prueba... (Ctrl+C para salir)\n");

  function checkCompletion() {
    if (receivedSignals && receivedProData) {
      console.log("\n🎉 ¡ÉXITO! Ambos eventos recibidos en tiempo real por el cliente.");
    }
  }
}

runTest();
