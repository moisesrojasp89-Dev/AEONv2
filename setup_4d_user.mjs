import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function setupTestUser() {
  console.log("1. Creando usuario temporal en auth.users...");
  const { data: authData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: 'test4d_pro@aeon.test',
    password: 'aeonRealtime4D!',
    email_confirm: true
  });

  if (userError) {
    console.error("❌ Error al crear usuario:", userError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Usuario creado (UUID: ${userId})`);

  console.log("2. Otorgando suscripción PRO en public.subscriptions...");
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan: 'pro',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString()
    });

  if (subError) {
    console.error("❌ Error al insertar suscripción:", subError.message);
    process.exit(1);
  }

  console.log("✅ Usuario test4d_pro@aeon.test configurado como PRO exitosamente.");
}

setupTestUser();
