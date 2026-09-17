# 🧠 El Manifiesto del Vibe Coder: De "Hacer que Funcione con IA" a Arquitectura de Software Profesional

> **Guía maestra de ingeniería, seguridad, modularidad y buenas prácticas para desarrolladores que construyen productos reales asistidos por Inteligencia Artificial.**

---

## Prólogo: La Paradoja del Vibe Coding

El **Vibe Coding** es el superpoder de nuestra era: una persona con una idea, buen criterio de producto y un modelo de lenguaje avanzado puede construir en dos semanas lo que antes requería un equipo entero de seis ingenieros durante seis meses.

Sin embargo, ese superpoder esconde una **trampa invisible**:
> *La Inteligencia Artificial está entrenada para complacerte de inmediato. Si le pides una función, te dará la ruta más corta para que la veas funcionando en tu pantalla, sin importar si para lograrlo viola la seguridad, duplica código, hardcodea secretos o crea una deuda técnica letal.*

Cuando el proyecto tiene 3 archivos, todo fluye. Pero cuando llega a 30 archivos, usuarios reales y una base de datos en la nube, el proyecto se vuelve frágil: **pantallas que parpadean solas, claves maestras visibles para cualquiera que abra la consola del navegador, tablas vulnerables a ser borradas con un clic, y estilos que colapsan en móviles.**

Esta guía no es teoría académica aburrida. Es un compendio de **lecciones de trinchera**, principios de arquitectura moderna y errores reales resueltos, diseñada para que cualquier creador asistido por IA aprenda a pensar, diseñar y gobernar sus proyectos como un **Arquitecto de Software Senior**.

---

## 🏛️ Módulo 1: Los Fundamentos Reales (El Trío Sagrado y el Renderizado)

Antes de delegarle código a la IA, debes entender qué ocurre realmente cuando alguien abre tu aplicación en su navegador.

```
                  ┌────────────────────────────────────────┐
                  │           EL NAVEGADOR WEB             │
                  │                                        │
                  │  ┌───────────┐    ┌─────────────────┐  │
                  │  │ HTML      │ ──►│ DOM Tree        │  │
                  │  │ Structure │    │ (Esqueleto)     │  │
                  │  └───────────┘    └────────┬────────┘  │
                  │                            │           │
                  │  ┌───────────┐    ┌────────▼────────┐  │
                  │  │ CSS       │ ──►│ CSSOM           │──┼──► [ RENDER TREE ] ──► [ PAINT / PANTALLA ]
                  │  │ Styles    │    │ (Piel/Forma)    │  │
                  │  └───────────┘    └─────────────────┘  │
                  │                            ▲           │
                  │  ┌───────────┐             │           │
                  │  │ JS        │ ────────────┘           │
                  │  │ Logic     │ (Manipula el DOM/Estilos│
                  │  └───────────┘  y pide datos por red)  │
                  └────────────────────────────────────────┘
```

### 1. HTML: El Esqueleto Semántico
* **Qué es:** Define el significado y la estructura de los datos.
* **Mala práctica de la IA:** Meterlo todo dentro de infinitos `<div><div><div>` genéricos sin accesibilidad ni estructura.
* **Criterio de Arquitecto:** Usa etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<nav>`, `<article>`, `<footer>`). Esto no es solo por estética: permite que los motores de búsqueda (SEO) indexen tu web y que los lectores de pantalla para personas con discapacidad funcionen.

### 2. CSS: La Piel y la Ergonomía
* **Qué es:** Las reglas matemáticas de pintura, espaciado, tipografía y adaptabilidad (responsive).
* **Mala práctica de la IA:** Poner estilos en línea (`style="color: red; margin-top: 15px;"`) o forzar `!important` cada vez que algo no encaja.
* **Criterio de Arquitecto:** Respeta la cascada natural del CSS. Diseña con un sistema de rejilla (*CSS Grid* / *Flexbox*) y centraliza todas las medidas y colores en variables.

### 3. JavaScript: El Cerebro del Cliente
* **Qué es:** El motor que responde a los clics del usuario, escucha eventos de red y actualiza el esqueleto (DOM) sin recargar toda la página.
* **Mala práctica de la IA:** Escribir funciones kilométricas de 400 líneas que mezclan peticiones a bases de datos, cálculos matemáticos y generación de HTML al mismo tiempo.
* **Criterio de Arquitecto:** Separa responsabilidades:
  - **Servicios:** Solo buscan datos (`fetch`).
  - **Plantillas:** Solo reciben datos y retornan HTML.
  - **Controladores:** Conectan el clic del usuario con el servicio y la plantilla.

---

## 🛡️ Módulo 2: La Separación Sagrada (Frontend vs Backend)

Este es el concepto donde falla el 90% de los principiantes con IA:

> ### ⚠️ REGLA DE ORO DE LA SEGURIDAD WEB
> **Todo lo que llega al Frontend (HTML, CSS, JS, archivos de imagen) se descarga físicamente en la computadora del usuario. POR DEFINICIÓN, ES 100% PÚBLICO.**

Cualquier persona, sin ser hacker, simplemente abriendo su navegador y presionando **F12** (Herramientas de Desarrollador / DevTools), puede:
1. Leer cada línea de tus archivos `.js`.
2. Inspeccionar cada variable y constante exportada.
3. Ver en la pestaña **Network (Red)** cada petición HTTP que hace tu web, qué datos envía y qué respuestas recibe.

```
┌────────────────────────────────────────┐       HTTPS REST / WSS       ┌────────────────────────────────────────┐
│         FRONTEND (CLIENTE / WEB)       │ ◄──────────────────────────► │           BACKEND (SERVIDOR)           │
│                                        │                              │                                        │
│ • HTML, CSS, JavaScript                │                              │ • Servidor Node/Python/Go              │
│ • Vistas, Formularios, Animaciones     │                              │ • Supabase / PostgreSQL / Firebase     │
│ • Claves PÚBLICAS (Anon Keys)          │                              │ • Edge Functions / Lambdas             │
│ • Tokens JWT temporales de sesión      │                              │ • Claves SECRETAS (Service Role, APIs) │
│                                        │                              │ • Lógica de negocio sensible (cobros)  │
│ ❌ NUNCA: Secret Keys ni lógica privada│                              │ 🔒 FORTALEZA PRIVADA Y PROTEGIDA       │
└────────────────────────────────────────┘                              └────────────────────────────────────────┘
```

### La Falacia del `display: none`
Uno de los errores más comunes de vibe coding es "ocultar" contenido exclusivo o premium poniéndole una clase CSS `display: none` o quitándolo visualmente de la pantalla, pero dejando que el archivo JavaScript descargue los datos en segundo plano.
* **La realidad:** Si tu frontend hace una petición a la base de datos que descarga información confidencial (por ejemplo, precios de coste, datos de otros usuarios, o señales premium), **el usuario ya los tiene en su pestaña Network**. El CSS solo tapa los ojos del usuario desprevenido; no protege los datos.
* **La solución:** Si un usuario no debe ver un dato, **el backend jamás debe enviarlo en la respuesta HTTP**.

---

## 🔑 Módulo 3: Fuga de Claves Secretas y API Keys

Cuando integras pasarelas de pago, modelos de lenguaje (OpenAI, Gemini, Claude) o bases de datos (Supabase, Firebase), te entregan dos tipos de credenciales:

| Tipo de Clave | Ejemplos | ¿Dónde puede estar? | ¿Qué pasa si se filtra? |
|---|---|:---:|---|
| **Pública / Client-Side** | `VITE_SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY` | Frontend (`.env` público / JS) | Nada grave. Está diseñada para ser pública y solo permite lo que tus reglas de seguridad autoricen. |
| **Privada / Master / Server-Side** | `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `STRIPE_SECRET_KEY` | **EXCLUSIVAMENTE en el Backend** (Servidor, Edge Functions, VPS) | **CATÁSTROFE.** El atacante toma control total de tu base de datos, suplanta usuarios o gasta miles de dólares en tu cuenta de IA. |

### Cómo proteger tus secretos con un Backend Proxy:

```
❌ FORMA PELIGROSA (Vibe Coder descuidado):
Navegador (JS) ──────[ OPENAI_API_KEY en código ]──────► API OpenAI
(Cualquier usuario extrae tu clave con F12 y te agota la cuota en 5 minutos)

✅ FORMA PROFESIONAL (Arquitectura Segura):
Navegador (JS) ──────► Tu Backend / Edge Function ──────► API OpenAI
                 (Verifica si el usuario tiene sesión)    (Usa la clave privada guardada
                                                         en variables de entorno del servidor)
```

### ¿Qué hacer si quemas una clave en Git?
Si por accidente subiste un archivo `.env` o una clave a GitHub:
1. **Asume que ya fue copiada por bots:** Existen rastreadores automáticos que leen commits de GitHub en menos de 2 segundos.
2. **Entra de inmediato a la consola del proveedor** (OpenAI, Supabase, Stripe, etc.) y presiona **Revoke / Regenerate**.
3. **No basta con hacer otro commit borrando la clave:** Git guarda el historial completo. La clave seguirá viva en los commits antiguos a menos que reescribas el historial o invalides la credencial.

---

## 🛡️ Módulo 4: Bases de Datos y Row Level Security (RLS)

Tradicionalmente, las aplicaciones web se conectaban a un backend (PHP, Express, Django) y este hablaba con la base de datos. Hoy en día, plataformas como Supabase permiten que el frontend hable directamente con la base de datos vía librerías JavaScript.

Esto ahorra tiempo, pero introduce un peligro mortal: **si no configuras Row Level Security (RLS), tu base de datos está completamente abierta.**

```
Sin RLS (Peligro Extremo):
Usuario Malicioso ──► supabase.from('users').delete().neq('id', 0);
PostgreSQL: "Comando recibido, borrando todos los usuarios de la empresa..." 💥

Con RLS Activo (Zero-Trust):
Usuario Malicioso ──► supabase.from('users').delete().neq('id', 0);
PostgreSQL: "Evaluando política RLS... No eres dueño de esas filas. Petición rechazada." 🛡️
```

### Las 3 Reglas de Oro de RLS para Vibe Coders:

1. **Habilita RLS en TODAS las tablas:**
   ```sql
   ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
   ```
2. **Lectura pública solo si el contenido es 100% abierto:**
   ```sql
   -- Ejemplo: Artículos de blog o catálogo público
   CREATE POLICY "Lectura publica articulos" 
     ON public.articulos FOR SELECT 
     USING (true);
   ```
3. **Restringe la propiedad por `user_id` autenticado:**
   ```sql
   -- El usuario SOLO puede ver y editar sus propios pedidos
   CREATE POLICY "Ver mis propios pedidos" 
     ON public.pedidos FOR SELECT 
     USING (auth.uid() = user_id);

   CREATE POLICY "Crear mis propios pedidos" 
     ON public.pedidos FOR INSERT 
     WITH CHECK (auth.uid() = user_id);
   ```
4. **Escrituras sensibles jamás deben permitirse desde el cliente:**
   - Columnas como `role` (`'admin'`), `tier` (`'pro'`), `balance_dolares` o `creditos_ia` **NUNCA** deben poder actualizarse mediante un `UPDATE` desde el frontend.
   - Si un usuario pudiera hacer `supabase.from('profiles').update({ tier: 'pro' })`, cualquiera tendría tu servicio gratis.
   - **Solución:** Las modificaciones de permisos y planes se realizan únicamente mediante funciones backend (`service_role`) o triggers de base de datos tras verificar el pago.

---

## 🚫 Módulo 5: Las 10 Malas Prácticas Típicas de los Modelos de IA (Y Cómo Domarlas)

Cuando programas con modelos de lenguaje (Claude, GPT, Gemini), notarás patrones repetitivos que ensucian el código. Aquí tienes el catálogo de anti-patrones y cómo corregirlos:

### 1. No tokenizar el CSS (Colores y radios mágicos hardcodeados)
* **El Anti-patrón:** La IA escribe `#0EA5E9` en un archivo, luego `#0088cc` en otro, luego `rgb(14, 165, 233)` en otro. Cuando quieres cambiar el color de tu marca o agregar modo oscuro, tienes que editar 40 archivos a mano.
* **La Solución:** Centraliza todo en un archivo `variables.css`:
  ```css
  :root {
    --color-primary: #0EA5E9;
    --color-primary-hover: #0284C7;
    --bg-surface: #0B0F17;
    --radius-md: 12px;
    --font-mono: 'JetBrains Mono', monospace;
  }
  ```
  Y exige a la IA: *"Nunca uses colores hexadecimales en los componentes; usa exclusivamente tokens `var(--token)` de variables.css"*.

### 2. Duplicar componentes globales (El desastre de las 10 Navbars)
* **El Anti-patrón:** Tienes 5 páginas (`index.html`, `perfil.html`, `contacto.html`, etc.) y la IA copia y pega el código completo del menú de navegación en cada una. El día que agregas un enlace nuevo, tienes que cambiarlo en 5 archivos distintos.
* **La Solución:** Crea un contenedor único `<div id="navbar-root"></div>` en cada HTML y usa un script centralizado (`src/js/navbar.js`) que monte la barra de navegación dinámicamente. Un solo cambio se reflejará en toda la plataforma.

### 3. El abuso de `!important` y estilos inline
* **El Anti-patrón:** Cuando la IA no logra que un botón se alinee, su solución vaga es meterle `!important` o inyectar `style="padding: 10px !important;"`. Esto destruye la cascada de estilos y hace imposible el mantenimiento.
* **La Solución:** Pon en tus reglas de proyecto: *"Prohibido el uso de !important y de atributos style inline en plantillas. Todo ajuste debe respetar la especificidad de clases CSS"*.

### 4. Archivos Monolito gigantescos (>500 líneas)
* **El Anti-patrón:** La IA prefiere añadir 100 líneas a un archivo existente antes que crear uno nuevo. Pronto tienes un `app.js` de 1,200 líneas donde encontrar un error es una pesadilla y la propia IA empieza a olvidar funciones o a truncar código.
* **La Solución:** Establece una regla de modularidad:
  ```text
  src/
  ├── js/
  │   ├── config/      (Constantes, rutas, configuraciones)
  │   ├── services/    (Peticiones a bases de datos y APIs externas)
  │   ├── templates/   (Generación de HTML puro y componentes)
  │   └── utils/       (Funciones matemáticas, formateadores de fecha)
  └── css/
      ├── variables.css
      └── components/  (Un archivo CSS por cada módulo)
  ```

### 5. Código Fantasma y Fugas de Red (Background Leaks)
* **El Anti-patrón:** Eliminas una tarjeta de la pantalla porque cambiaste de idea, pero dejas el código en JavaScript que consulta la base de datos o mantiene un WebSocket abierto en segundo plano.
* **Consecuencia:** Tu aplicación consume recursos, agota límites de peticiones y descarga datos que nadie ve.
* **La Solución:** Cuando elimines un elemento visual, haz la purga completa en 3 niveles:
  1. *Markup:* Elimina el HTML.
  2. *Lógica:* Elimina el JavaScript que busca esos datos (`fetch`, suscripciones realtime).
  3. *Estilos:* Elimina las clases CSS huérfanas.

### 6. Alucinación de datos y plantillas rígidas (Hardcoding)
* **El Anti-patrón:** Si la IA no sabe qué mostrar, inventa un objeto de prueba estático en el código para que "se vea bien" la maqueta. Ese dato falso termina saliendo a producción (ejemplo: un gráfico que siempre muestra $1,500 aunque la cuenta esté en $0).
* **La Solución:** Obliga a la IA a diseñar **Estados Vacíos (*Empty States*)** y **Estados de Carga (*Loading States*)**:
  - ¿Qué muestra la pantalla mientras cargan los datos? (Un spinner o esqueleto).
  - ¿Qué muestra si la lista está vacía? (*"No tienes pedidos activos"*).
  - ¿Qué muestra si falla la conexión? (*"Error al conectar. Reintentar"*).

### 7. Bucles de Auto-Recargas (Hot Reload Loops) en Vite
* **El Anti-patrón:** El backend o un script en segundo plano escribe un archivo JSON de logs o caché en una carpeta dentro del proyecto. El servidor de desarrollo (Vite) detecta que un archivo cambió y refresca el navegador cada 15 segundos.
* **La Solución:** En `vite.config.js`, configura `server.watch.ignored` para ignorar carpetas de datos temporales, scripts o logs.

### 8. Desincronización de `package-lock.json` y dependencias
* **El Anti-patrón:** Instalas o editas `package.json` manualmente y despliegas en Vercel o Netlify. El servidor de integración continua ejecuta `npm ci` y crashea con `Module not found` o `Lockfile out of sync`.
* **La Solución:** Siempre que modifiques librerías, ejecuta `npm install` localmente para que `package-lock.json` se sincronice y verifica que las herramientas de build (`vite`, `esbuild`) no queden huérfanas en entornos de producción.

### 9. Sentencias DDL destructivas a ciegas (`DROP TABLE`)
* **El Anti-patrón:** Quieres limpiar la base de datos y le pides a la IA que tire un `DROP TABLE` directo en el panel de producción sin revisar dependencias.
* **Peligro:** `DROP TABLE CASCADE` arrastra llaves foráneas, pero deja intactas funciones RPC o Triggers que llaman a esa tabla internamente. Cuando un usuario intente operar, la función crasheará con `"relation does not exist"`.
* **La Solución:**
  1. Haz un volcado o respaldo previo (`pg_dump` o export JSON).
  2. Revisa y elimina primero las funciones dependientes (`DROP FUNCTION`).
  3. Elimina las políticas RLS y finalmente la tabla.

### 10. Consultas masivas sin límites defensivos
* **El Anti-patrón:** Escribir `supabase.from('mensajes').select('*')`. Si tienes 10 mensajes funciona perfecto; si tienes 50,000 mensajes tu web colapsará el navegador descargando 100 megabytes de texto.
* **La Solución:** Toda consulta en frontend debe llevar paginación o un límite defensivo obligatorio: `.limit(20)`.

---

## 🎯 Módulo 6: Cómo Hablarle a la IA con Criterio de Arquitecto

El resultado que obtienes de una IA depende del nivel de abstracción de tu solicitud:

| Nivel | Lo que pide un Vibe Coder Novato | Lo que pide un Vibe Coder Arquitecto |
|---|---|---|
| **Estilos** | *"Haz que el botón sea azul y agrégale una sombra"* | *"Estiliza el botón usando exclusivamente tokens de `variables.css` (`var(--accent)`). No uses `!important` y mantén el CSS en su archivo de componente dedicado."* |
| **Backend** | *"Guarda este dato en Supabase"* | *"Crea la función para guardar este dato. Asegúrate de que las credenciales maestras no queden en el frontend. Si requiere privilegios de admin, implementa la llamada a través de una Edge Function protegida con JWT."* |
| **Componentes**| *"Agrega un formulario para comentarios"* | *"Crea el componente `commentForm.js` desacoplado. Debe manejar 3 estados explícitos: cargando, éxito y error de red. Añade un límite defensivo de 280 caracteres."* |

### El Flujo de Trabajo en 3 Fases:
1. **Fase de Análisis (No toques código todavía):** Pídele a la IA que investigue el impacto: *"Antes de escribir código, analiza qué archivos se van a ver afectados y si hay riesgos de romper otras vistas"*.
2. **Fase de Planificación:** Revisa el plan de cambios. Si algo no tiene sentido arquitectónico, corrígelo antes de que empiece a programar.
3. **Fase de Verificación:** Exige evidencia empírica: corre los tests automatizados y audita la compilación de producción (`npm run build`).

---

## ✅ Módulo 7: El Checklist de Oro antes de Desplegar a Producción

Antes de enviar tu proyecto al mundo (Vercel, Netlify, Cloudflare, VPS), pasa tu web por estos 8 filtros:

- [ ] **1. Auditoría DevTools F12 (Pestaña Network):** Abre tu web, navega por todas las páginas con la consola abierta. ¿Ves alguna petición que descargue contraseñas, tokens privados, o información que el usuario no debería ver?
- [ ] **2. Cero Secretos en el Código:** Haz una búsqueda global en tu editor de texto buscando palabras como `secret`, `service_role`, `api_key`. ¿Quedó alguna quemada en un archivo `.js`?
- [ ] **3. Políticas RLS Activas:** Entra a tu base de datos y verifica que todas las tablas tengan el candado de RLS encendido. Prueba consultar una tabla protegida sin iniciar sesión para verificar que la rechaza.
- [ ] **4. Build de Producción Exitoso:** Ejecuta `npm run build` en tu terminal local. Debe terminar con **cero errores** y cero advertencias críticas.
- [ ] **5. Paridad Móvil al 100%:** Abre las herramientas de desarrollador en modo emulación móvil (iPhone / Android). ¿Hay textos montados uno encima de otro? ¿Aparece una barra de desplazamiento horizontal indeseada?
- [ ] **6. Manejo Honesto de Errores:** Apaga tu Wi-Fi por 10 segundos mientras usas la web. ¿La aplicación muestra un mensaje amigable o se queda congelada para siempre en blanco?
- [ ] **7. Cero Código Muerto:** ¿Borraste los archivos CSS y JS de funciones viejas que ya no se muestran en pantalla?
- [ ] **8. Respaldo de Base de Datos:** ¿Tienes una copia de seguridad o script SQL de creación de tablas antes de aplicar cualquier cambio destructivo?

---

## Epílogo: El Arte de Construir para que Dure

Programar con Inteligencia Artificial no significa programar con descuido. El verdadero arte del desarrollo moderno es **usar la velocidad de la IA para iterar como el viento, mientras aplicas el criterio de ingeniería para construir sobre roca sólida.**

Cuando entiendes dónde termina el frontend, dónde empieza el backend, cómo fluyen los datos y cómo proteger tus secretos, dejas de ser alguien que simplemente copia y pega código: **te conviertes en un creador capaz de llevar cualquier idea al mundo real con estándar profesional.**
