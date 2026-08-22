# AEON — Estado Actual vs Arquitectura Objetivo (Master Plan)

> **Documento vivo de diagnóstico arquitectónico, auditoría técnica y mapa de ruta de modernización de AEON Terminal.**
> **Última actualización:** 22 de Agosto de 2026

---

## 1. Estado de Ejecución de Sprints

| Fase | Sprint | Descripción | Estado |
|---|---|---|---|
| **Fase 0** | **0.1** | Seguridad Crítica (.gitignore, rotación de secrets, .env) | **100% COMPLETADO** |
| | **0.2** | Limpieza de Raíz y Organización (`scripts/`, dependencias) | **100% COMPLETADO** |
| | **0.3** | Design System & CSS (variables, tokens, backdrop-filter) | **100% COMPLETADO** |
| | **0.4** | Frontend Hardening XSS & Deno.serve en Edge Function | **100% COMPLETADO** |
| **Fase 1** | **1.1** | Constantes Centralizadas, Legal CSS y `CONVENTIONS.md` | **100% COMPLETADO** |
| | **1.2** | Servicios Desacoplados (`signalService`, `newsService`) | **100% COMPLETADO** |
| | **1.3** | Accesibilidad ARIA, Validación de Password & Formularios | **100% COMPLETADO** |
| | **1.4** | Edge Function Proxy de TwelveData | **100% COMPLETADO** |
| **Fase 2** | **2.1** | Variación Porcentual Diaria Real de Activos OANDA | **100% COMPLETADO** |
| | **2.2** | Adaptador `marketService` & Sistema de Caché Instantáneo | **100% COMPLETADO** |
| | **2.3** | Desacoplamiento de Datos de Gráfico (`chart.js`) | *Pendiente* |
| **Fase 3** | **3.1** | Flujo de Recuperación de Password & Dashboard de Usuario | **100% COMPLETADO** |
| | **3.2** | Servidor SMTP Personalizado (`noreply@aeon.trading`) & Plantillas | *Pendiente* |
| | **3.3** | Integración Stripe Checkout & Portal de Suscripción PRO | *Pendiente* |
| | **3.4** | Perfil de Usuario Avanzado (Correo alternativo, Avatar) | *Pendiente* |
| **Fase 4** | **4.1** | Panel de Administración de Señales y Noticias | *Pendiente* |

---

## 2. Logros Recientes (Fase 2.1, 2.2 & Auth/Dashboard)

1. **Precios y Porcentajes en Tiempo Real:**
   - La Edge Function `oanda` consulta en paralelo cotizaciones en vivo y velas diarias (`granularity=D`).
   - Cálculo dinámico de variación de sesión diaria: `((close - open) / open) * 100`.
   - Soporte para XAU/USD (Oro), EUR/USD, SPX500 (S&P 500), NAS100 (NASDAQ) y US30 (DOW 30) con coloreado visual y flechas direccionales.
2. **Caché en Cliente con Restauración en 0ms (`marketService.js`):**
   - Los precios se persisten en `sessionStorage` y `localStorage`.
   - Al recargar la web o volver a abrirla, los precios se renderizan de inmediato sin pantalla en blanco ni parpadeo.
3. **Flujo de Recuperación de Contraseña (`recuperar.html` / `actualizar-password.html`):**
   - Conectado a Supabase Auth `resetPasswordForEmail` y `updateUser`.
   - Escucha de evento `PASSWORD_RECOVERY` para redirección automática.
4. **Panel de Usuario (`dashboard.html`):**
   - Vista de perfil con nombre completo, correo, estado de membresía PRO/Free y vigencia.
   - Accesos directos y cierre de sesión sincronizado.
