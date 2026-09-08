#!/usr/bin/env python3
"""
==============================================================================
AEON Terminal — Panel de Control de Pagos Cripto (Admin CLI)
Gobernanza: Activación Instantánea de Membresías PRO vía Service Role
==============================================================================
Uso:
  python scripts/admin_payments.py list
  python scripts/admin_payments.py approve <ORDER_ID o PAYMENT_ID>
  python scripts/admin_payments.py reject <ORDER_ID o PAYMENT_ID>
"""

import sys
import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

# Configurar salida UTF-8 para consola Windows
sys.stdout.reconfigure(encoding='utf-8')

def get_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if not os.path.exists(env_path):
        env_path = '.env'
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ENV = get_env()
SUPABASE_URL = ENV.get('SUPABASE_URL')
SERVICE_KEY = ENV.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en .env")
    sys.exit(1)

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def api_request(endpoint, method='GET', data=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"❌ Error HTTP {e.code} en {endpoint}: {err_msg}")
        return None
    except Exception as e:
        print(f"❌ Error de red: {e}")
        return None

def list_pending():
    print("\n========================================================")
    print(" ✦ AEON TERMINAL · ÓRDENES DE PAGO PENDIENTES ✦")
    print("========================================================\n")

    payments = api_request("payments?status=eq.pending&order=created_at.desc")
    if payments is None:
        print("💡 Nota: Asegúrate de ejecutar la migración 'supabase/migrations/00005_crypto_payments.sql' en Supabase.")
        return

    if not payments:
        print("✓ No hay pagos pendientes en este momento. Todas las órdenes están al día.")
        return

    print(f"Se encontraron {len(payments)} pago(s) pendiente(s):\n")
    for p in payments:
        oid = p.get('order_id', 'N/A')
        email = p.get('user_email', 'Desconocido')
        plan = p.get('plan', 'N/A').upper()
        amount = p.get('amount', 0)
        method = p.get('payment_method', 'binance_pay')
        tx = p.get('tx_reference', 'N/A')
        date = p.get('created_at', '')[:16].replace('T', ' ')
        
        print(f"• Orden: {oid}")
        print(f"  Usuario:   {email}")
        print(f"  Plan:      {plan} (${amount} USDT)")
        print(f"  Método:    {method}")
        print(f"  Ref / Tx:  {tx}")
        print(f"  Fecha:     {date} UTC")
        print(f"  Comando para aprobar: python scripts/admin_payments.py approve {oid}")
        print("-" * 50)

def approve_payment(target_ref):
    print(f"\nBuscando orden '{target_ref}'...")
    
    # Buscar por order_id o id
    payments = api_request(f"payments?or=(order_id.eq.{target_ref},id.eq.{target_ref})&limit=1")
    if not payments or len(payments) == 0:
        print(f"❌ No se encontró ninguna orden con el identificador '{target_ref}'.")
        return

    pay = payments[0]
    pid = pay['id']
    user_id = pay['user_id']
    user_email = pay.get('user_email', user_id)
    plan = pay.get('plan', 'monthly')
    plan_days = int(pay.get('plan_days', 30))

    if pay.get('status') == 'approved':
        print(f"⚠ Esta orden ya había sido aprobada previamente.")
        return

    # 1. Marcar pago como aprobado
    now_utc = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=plan_days)

    upd_pay = api_request(f"payments?id=eq.{pid}", method='PATCH', data={
        'status': 'approved',
        'updated_at': now_utc.isoformat()
    })

    # 2. Actualizar perfil del usuario a 'pro'
    upd_profile = api_request(f"profiles?id=eq.{user_id}", method='PATCH', data={
        'tier': 'pro',
        'updated_at': now_utc.isoformat()
    })

    # 3. Insertar o actualizar suscripción
    sub_data = {
        'user_id': user_id,
        'plan': 'pro',
        'status': 'active',
        'current_period_start': now_utc.isoformat(),
        'current_period_end': end_date.isoformat(),
        'updated_at': now_utc.isoformat()
    }
    ins_sub = api_request("subscriptions", method='POST', data=sub_data)

    print("\n" + "=" * 55)
    print(" ✅ ¡ORDEN APROBADA & ACCESO PRO ACTIVADO CON ÉXITO!")
    print("=" * 55)
    print(f" • Orden:          {pay.get('order_id')}")
    print(f" • Usuario:        {user_email}")
    print(f" • Plan Activado:  {plan.upper()} ({plan_days} días)")
    print(f" • Vigencia Hasta: {end_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f" • Rango Perfil:   PRO (Desbloqueo Total de IA & Señales)")
    print("=" * 55 + "\n")

def reject_payment(target_ref):
    payments = api_request(f"payments?or=(order_id.eq.{target_ref},id.eq.{target_ref})&limit=1")
    if not payments:
        print(f"❌ Orden '{target_ref}' no encontrada.")
        return
    pid = payments[0]['id']
    api_request(f"payments?id=eq.{pid}", method='PATCH', data={'status': 'rejected', 'updated_at': datetime.now(timezone.utc).isoformat()})
    print(f"✓ Orden '{target_ref}' marcada como RECHAZADA.")

def main():
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python scripts/admin_payments.py list")
        print("  python scripts/admin_payments.py approve <ORDER_ID>")
        print("  python scripts/admin_payments.py reject <ORDER_ID>")
        return

    cmd = sys.argv[1].lower()
    if cmd == 'list':
        list_pending()
    elif cmd == 'approve' and len(sys.argv) >= 3:
        approve_payment(sys.argv[2])
    elif cmd == 'reject' and len(sys.argv) >= 3:
        reject_payment(sys.argv[2])
    else:
        print(f"Comando no reconocido: {cmd}")

if __name__ == '__main__':
    main()
