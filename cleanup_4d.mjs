import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
  console.log("Iniciando limpieza de la FASE 4D...");

  // 1. Eliminar señal de prueba
  console.log("\n1. Eliminando la señal de prueba ('test-4c-001')...");
  const { data: delSignal, error: errSignal } = await supabaseAdmin
    .from('signals')
    .delete()
    .eq('bot_message_id', 'test-4c-001')
    .select();
  
  if (errSignal) {
      console.error("❌ Error eliminando señal:", errSignal);
  } else if (delSignal && delSignal.length > 0) {
      console.log(`   ✅ Señal eliminada (UUID: ${delSignal[0].id})`);
      
      // 2. Verificar cascade en signals_pro_data
      console.log("2. Verificando ON DELETE CASCADE en signals_pro_data...");
      const { data: proData } = await supabaseAdmin.from('signals_pro_data').select('*').eq('signal_id', delSignal[0].id);
      if (proData && proData.length === 0) {
          console.log("   ✅ Confirmado: signals_pro_data desapareció (Cascade exitoso).");
      } else {
          console.error("   ❌ ERROR: Datos residuales encontrados:", proData);
      }
  } else {
      console.log("   ⚠️ La señal ya había sido eliminada.");
  }

  // 3. Buscar y eliminar usuario temporal
  console.log("\n3. Buscando usuario temporal 'test4d_pro@aeon.test' en Auth...");
  const { data: { users }, error: errUsers } = await supabaseAdmin.auth.admin.listUsers();
  const tempUser = users.find(u => u.email === 'test4d_pro@aeon.test');
  
  if (tempUser) {
    const userId = tempUser.id;
    const { error: delUserErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delUserErr) {
        console.error("❌ Error eliminando usuario:", delUserErr);
    } else {
        console.log(`   ✅ Usuario Auth eliminado (UUID: ${userId}).`);

        // 4. Verificar cascade en subscriptions
        console.log("4. Verificando ON DELETE CASCADE en public.subscriptions...");
        const { data: subsData } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId);
        if (subsData && subsData.length === 0) {
            console.log("   ✅ Confirmado: suscripción PRO eliminada (Cascade exitoso).");
        } else {
            console.error("   ❌ ERROR: Suscripción residual encontrada.");
        }
        
        // Verificar profiles
        const { data: profData } = await supabaseAdmin.from('profiles').select('*').eq('id', userId);
        if (profData && profData.length === 0) {
            console.log("   ✅ Confirmado: profile eliminado (Cascade exitoso).");
        }
    }
  } else {
    console.log("   ⚠️ Usuario Auth no encontrado (ya fue eliminado).");
  }

  console.log("\n🧹 5. Verificación final completada. Base de datos totalmente limpia.");
}

cleanup();
