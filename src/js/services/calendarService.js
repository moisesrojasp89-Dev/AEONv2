/* ============================================================
   AEON · services/calendarService.js
   Economic Calendar — Macro Context Engine
   ============================================================
   Architecture:
     1. EVENT_CONTEXT_MAP  → exact event-name lookup (precise, per-event)
     2. getMacroImpactContext() → category keyword fallback for future events
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

const CALENDAR_CACHE_KEY = 'AEON_CALENDAR_CACHE_V3';

/* ============================================================
   EVENT CONTEXT MAP
   Key: event_name.toLowerCase() (exactly as stored in DB)
   Value: { category, what, affectedAssets, volatilityPips }
   ============================================================ */
const EVENT_CONTEXT_MAP = {

  /* ── USD ────────────────────────────────────────────────── */
  'ism manufacturing pmi': {
    category: 'PMI Manufacturero ISM',
    what: 'El ISM Manufacturing PMI (Institute for Supply Management) es una encuesta mensual a directores de compras de más de 300 empresas industriales de EE.UU. Mide nuevos pedidos, producción, empleo, entregas e inventarios. Sobre 50 = expansión del sector; bajo 50 = contracción. Es el dato PMI de referencia del mercado americano y uno de los primeros indicadores del mes: sale el primer día hábil. Anticipa el PIB industrial y guía las expectativas sobre la salud de la demanda interna.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD', 'XAU/USD', 'US30'],
    volatilityPips: '25–60 pips',
  },

  'ism manufacturing prices': {
    category: 'Precios Manufactureros ISM',
    what: 'Subíndice de precios de la encuesta ISM Manufacturing: mide qué porcentaje de empresas manufactureras pagó precios más altos por sus insumos. NO es el PMI de actividad — es un indicador de presión inflacionaria en la cadena de producción. Sobre 50 = precios subiendo en el sector; un dato elevado puede anticipar presión inflacionaria futura en el PPI y CPI. Impacto en USD: datos altos = más inflación = Fed más hawkish.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'jolts job openings': {
    category: 'Vacantes Laborales JOLTS',
    what: 'JOLTS (Job Openings and Labor Turnover Survey): informe mensual del Bureau of Labor Statistics que mide el número de vacantes laborales abiertas en EE.UU. Un indicador de la fortaleza del mercado laboral desde el lado de la demanda de trabajadores — cuántos puestos hay disponibles vs. cuántos trabajadores buscan empleo. La Fed lo usa para medir la tensión del mercado laboral (tight labor market). Vacantes altas = mercado laboral tenso = presión salarial = inflacionario para el USD.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'],
    volatilityPips: '15–40 pips',
  },

  'adp non-farm employment change': {
    category: 'Empleo Privado ADP',
    what: 'Publicación privada de ADP (Automatic Data Processing) que estima la creación de empleo en el sector privado de EE.UU. Se publica dos días antes del NFP oficial del BLS. Actúa como termómetro adelantado del mercado laboral pero históricamente tiene baja correlación mes a mes con el NFP oficial. Un dato ADP muy divergente del consenso mueve el USD porque el mercado ajusta sus expectativas para el NFP. No incluye empleo gubernamental.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '20–50 pips',
  },

  'ism services pmi': {
    category: 'PMI Servicios ISM',
    what: 'ISM Services PMI (No Manufacturero): encuesta a más de 370 empresas de servicios de EE.UU. — el sector servicios representa aproximadamente el 80% del PIB americano. Mide actividad empresarial, nuevos pedidos, empleo y precios del sector servicios. Sobre 50 = expansión. Es más relevante que el ISM Manufacturing para la economía americana por el peso del sector. Dato clave para estimar el PIB del trimestre y las expectativas de empleo.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD', 'XAU/USD'],
    volatilityPips: '20–50 pips',
  },

  'president trump speaks': {
    category: 'Discurso Presidencial — Riesgo Político',
    what: 'Intervención pública del Presidente de EE.UU. Las declaraciones presidenciales pueden mover los mercados de forma brusca e impredecible, especialmente cuando abordan política comercial (aranceles), política monetaria (presión sobre la Fed), relaciones geopolíticas, o regulación de sectores específicos. El USD, XAU/USD y los índices americanos son los activos más sensibles. La volatilidad es asimétrica: las sorpresas suelen ser más impactantes que los discursos anunciados.',
    affectedAssets: ['DXY', 'XAU/USD', 'SPX500', 'EUR/USD', 'BTC/USD'],
    volatilityPips: '10–80 pips (impredecible)',
  },

  'unemployment claims': {
    category: 'Solicitudes de Subsidio por Desempleo',
    what: 'Dato semanal (cada jueves) del número de personas que solicitaron subsidio por desempleo en EE.UU. por primera vez (Initial Claims). Es el indicador de alta frecuencia más seguido del mercado laboral americano. Claims en baja = mercado laboral sano = menos presión para que la Fed recorte. Claims al alza = debilitamiento del empleo = más probabilidad de recortes = USD más débil. Comparar siempre con el promedio de 4 semanas para filtrar ruido.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '10–30 pips',
  },

  'average hourly earnings m/m': {
    category: 'Salarios por Hora (Mensual)',
    what: 'Mide la variación mensual en los salarios medios por hora en el sector no agrícola de EE.UU. Se publica junto al NFP el primer viernes del mes. Es el componente más relevante para la inflación dentro del informe de empleo: salarios más altos → mayor poder adquisitivo → más consumo → presión inflacionaria → la Fed debe mantener tipos altos → alcista para el USD. Un dato de salarios sólido puede superar en impacto al propio NFP si la diferencia respecto al consenso es grande.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'],
    volatilityPips: '20–60 pips',
  },

  'non-farm employment change': {
    category: 'Nóminas No Agrícolas (NFP)',
    what: 'NFP (Non-Farm Payrolls): mide la variación neta mensual de empleados en todos los sectores de EE.UU. excepto agricultura, gobierno general, trabajadores domésticos y autónomos no constituidos en sociedad — representa el ≈80% de la fuerza laboral que contribuye al PIB. Publicado el primer viernes de cada mes por la Oficina de Estadísticas Laborales (BLS). Es el dato de mayor impacto global del calendario económico: mueve DXY, XAU/USD, EUR/USD y todos los índices americanos en segundos. NFP sólido = USD alcista, Oro bajista; NFP débil = USD bajista, Oro alcista, apertura a recortes de la Fed.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'US30', 'GBP/USD'],
    volatilityPips: '50–130 pips',
  },

  'unemployment rate': {
    category: 'Tasa de Desempleo',
    what: 'Porcentaje de la población activa de EE.UU. que está desempleada. Uno de los dos mandatos formales de la Reserva Federal (pleno empleo + estabilidad de precios). El nivel considerado de "pleno empleo" está entre 3.5% y 4.5%. Se publica junto al NFP el primer viernes del mes. Una tasa subiendo por encima de 4.5% es señal de alarma para la Fed e incrementa las probabilidades de recortes de tipos, debilitando el USD. Al revés, una tasa muy baja indica tensión laboral e inflación salarial.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'],
    volatilityPips: '20–70 pips',
  },

  'core cpi m/m': {
    category: 'CPI Subyacente Mensual',
    what: 'CPI Subyacente (Core CPI) mensual: mide la variación del índice de precios al consumidor excluyendo alimentos y energía (excluidos por su alta volatilidad estacional). Es la lectura de inflación que la Fed monitorea más de cerca para sus decisiones de tipos porque muestra la tendencia estructural de la inflación. Se publica el segundo martes de cada mes. Una sorpresa al alza (por encima del consenso) = la inflación subyacente no está cediendo = la Fed debe mantener tipos o subir → USD alcista, XAU/USD y acciones bajo presión.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100'],
    volatilityPips: '40–90 pips',
  },

  'core cpi y/y': {
    category: 'CPI Subyacente Interanual',
    what: 'Variación interanual del CPI Subyacente (excluyendo alimentos y energía). Compara el nivel actual de precios subyacentes con el mismo mes del año anterior. La Fed tiene como objetivo inflación del 2% en el PCE pero también vigila estrechamente el Core CPI y/y. Lecturas persistentemente por encima del 3% son señal de que la inflación no está completamente controlada. Este dato tiene más peso que el m/m para decisiones de política monetaria de largo plazo.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'NAS100'],
    volatilityPips: '35–85 pips',
  },

  'cpi m/m': {
    category: 'IPC Mensual',
    what: 'Variación mensual del Índice de Precios al Consumidor: mide el cambio promedio de precios pagados por los consumidores en EE.UU. en el último mes. Se publica el segundo martes de cada mes junto al Core CPI. El dato mensual captura la velocidad actual de la inflación — si el CPI m/m sigue sorprendiendo al alza varios meses seguidos, la presión sobre la Fed para no recortar tipos aumenta significativamente.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100'],
    volatilityPips: '40–90 pips',
  },

  'cpi y/y': {
    category: 'IPC Interanual',
    what: 'Variación interanual del IPC de EE.UU.: la lectura de inflación más citada en los medios. Compara el nivel general de precios con el mismo mes del año anterior. Tras el pico inflacionario de 2022 (9.1%), la Fed llevó los tipos a máximos de 20 años para reducirlo. Lecturas cercanas al 2% = objetivo cumplido = más margen para recortes. Lecturas por encima del 3% = el problema inflacionario persiste. El mercado reacciona con fuerza al CPI y/y si diverge del consenso en 0.2 puntos o más.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'NAS100'],
    volatilityPips: '40–90 pips',
  },

  'core ppi m/m': {
    category: 'IPP Subyacente Mensual (Productor)',
    what: 'Variación mensual del Índice de Precios al Productor subyacente (excluyendo alimentos y energía). Mide la inflación en el origen del ciclo productivo — lo que pagan las empresas por sus insumos antes de trasladar esos costes al consumidor. Anticipa al CPI por 1–2 meses porque los productores tardan en repercutir los aumentos de costes. Un PPI Core elevado es una señal adelantada de que la inflación al consumidor seguirá siendo resistente.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '15–40 pips',
  },

  'ppi m/m': {
    category: 'IPP Mensual (Productor)',
    what: 'Índice de Precios al Productor mensual: incluye todos los sectores (con alimentos y energía). Mide los precios que reciben los productores domésticos por sus productos terminados. Se publica junto al Core PPI el día después del CPI. Un PPI total elevado refleja presión de costes en toda la cadena productiva. Si tanto PPI como CPI sorprenden al alza en el mismo ciclo, la narrativa de inflación persistente se refuerza considerablemente.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '15–40 pips',
  },

  'core retail sales m/m': {
    category: 'Ventas Minoristas Subyacentes',
    what: 'Variación mensual de las ventas minoristas excluyendo automóviles (el componente más volátil). El "Core" Retail Sales es más fiable que el titular para medir la tendencia del consumo. El consumo privado representa aproximadamente el 70% del PIB de EE.UU., por lo que este dato es un indicador líder del crecimiento económico. Ventas minoristas fuertes = economía resistente = la Fed no tiene urgencia de recortar = USD alcista.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD', 'XAU/USD'],
    volatilityPips: '20–45 pips',
  },

  'retail sales m/m': {
    category: 'Ventas Minoristas (Titular)',
    what: 'Variación mensual total de las ventas minoristas de EE.UU., incluyendo automóviles. Mide el gasto del consumidor en bienes físicos. El titular puede ser volátil por las compras de automóviles; por eso el mercado generalmente compara ambos (titular + Core). Una lectura sólida confirma que el consumidor americano sigue gastando a pesar de los tipos altos — señal de resistencia económica que mantiene la presión sobre la Fed.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD'],
    volatilityPips: '20–45 pips',
  },

  'prelim uom consumer sentiment': {
    category: 'Confianza del Consumidor UoM (Preliminar)',
    what: 'Encuesta preliminar de Confianza del Consumidor de la Universidad de Michigan (UoM). Mide cómo se sienten los hogares americanos sobre su situación financiera personal y la economía en general. Es un indicador adelantado del consumo futuro: consumidor confiado = dispuesto a gastar más. Se publica a mediados de mes (preliminar) y se revisa a finales. Lecturas por debajo de 60 sugieren contracción del consumo. La Fed lo monitorea como señal de si los hogares están resistiendo el entorno de tipos altos.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'prelim uom inflation expectations': {
    category: 'Expectativas de Inflación UoM (Preliminar)',
    what: 'Componente de la encuesta UoM que mide qué inflación esperan los consumidores en los próximos 12 meses. Dato muy seguido por la Fed: si las expectativas de inflación se desanclan al alza (suben persistentemente), la Fed puede verse obligada a actuar más agresivamente incluso si la inflación actual está cediendo. Jerome Powell citó explícitamente las expectativas de inflación a largo plazo de UoM en varios discursos de política monetaria.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'fomc meeting minutes': {
    category: 'Actas de la Reunión del FOMC',
    what: 'Las actas del Comité Federal de Mercado Abierto (FOMC) se publican tres semanas después de cada reunión de política monetaria. Revelan en detalle los debates internos: qué miembros querían subir, mantener o recortar tasas; cuánta preocupación hubo sobre la inflación vs. el empleo; qué datos "necesita ver" la Fed antes de actuar. El mercado las analiza en busca de pistas sobre el ritmo de futuros recortes o subidas. Pueden reinterpretar completamente la narrativa post-reunión si hay divergencias inesperadas entre miembros.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'BTC/USD'],
    volatilityPips: '30–80 pips',
  },

  'philly fed manufacturing index': {
    category: 'Índice Manufacturero Philly Fed',
    what: 'Encuesta mensual del Banco de la Reserva Federal de Filadelfia a empresas manufactureras del área del Atlántico Medio. Mide actividad general, nuevos pedidos, envíos, empleo y precios. Sobre 0 = expansión; bajo 0 = contracción (distinto al PMI que usa 50 como umbral). Publicado el tercer jueves del mes, sirve como indicador regional y a veces anticipa el ISM Manufacturing del mes siguiente. Impacto moderado en USD salvo sorpresas grandes.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'cb consumer confidence': {
    category: 'Confianza del Consumidor Conference Board',
    what: 'Encuesta mensual del Conference Board a 3.000 hogares americanos sobre sus expectativas económicas presentes y futuras. Incluye dos subíndices: situación actual y expectativas a 6 meses. Se publica el último martes del mes. Históricamente más correlacionado con el mercado laboral que con los mercados financieros (a diferencia del UoM que es más sensible a los mercados). Una caída brusca en el índice de Situación Actual puede preceder al aumento de las solicitudes de desempleo.',
    affectedAssets: ['DXY', 'SPX500', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'core pce price index m/m': {
    category: 'PCE Subyacente Mensual (Indicador Preferido de la Fed)',
    what: 'El Core PCE (Personal Consumption Expenditures Price Index excluyendo alimentos y energía) es el indicador de inflación preferido oficial de la Reserva Federal. A diferencia del CPI, el PCE usa una cesta de consumo que se ajusta automáticamente cuando los consumidores sustituyen productos más caros por más baratos (efecto sustitución). La Fed tiene como objetivo un PCE Core del 2% a largo plazo. Este dato, publicado el último viernes del mes junto al PIB preliminar, puede mover todos los activos denominados en USD de forma tan significativa como el CPI.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100', 'BTC/USD'],
    volatilityPips: '35–85 pips',
  },

  'prelim gdp q/q': {
    category: 'PIB Preliminar Trimestral (EE.UU.)',
    what: 'Primera estimación de la tasa de crecimiento del PIB de EE.UU. en el trimestre anterior (expresado en tasa anualizada). El BEA (Bureau of Economic Analysis) publica tres lecturas: Advance (preliminar), Second Estimate y Third/Final Estimate. El mercado reacciona más a la lectura Advance por ser la primera. Un PIB negativo dos trimestres consecutivos = recesión técnica, lo cual presionaría a la Fed a recortar tasas agresivamente. Los mercados de renta variable son los más sensibles a las lecturas del PIB.',
    affectedAssets: ['DXY', 'SPX500', 'NAS100', 'EUR/USD', 'XAU/USD'],
    volatilityPips: '25–65 pips',
  },

  'prelim gdp price index q/q': {
    category: 'Deflactor del PIB (Preliminar)',
    what: 'El Deflactor del PIB mide la inflación "desde el lado de la producción" — la diferencia entre el PIB nominal y el PIB real. Es la medida de inflación más amplia de la economía porque cubre todos los bienes y servicios, no solo los del consumidor. Se publica junto al PIB preliminar. Un deflactor persistentemente alto indica que la inflación sigue siendo un factor estructural en la economía, lo que limita el margen de la Fed para recortar tipos.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD'],
    volatilityPips: '10–25 pips',
  },

  'fed chairman warsh speaks': {
    category: 'Discurso del Presidente de la Fed',
    what: 'Intervención pública del Presidente de la Reserva Federal. Cualquier declaración sobre el rumbo de los tipos de interés, el estado de la inflación o el mercado laboral puede mover drásticamente el USD, XAU/USD y todos los mercados globales. El mercado analiza cada palabra en busca de señales "hawkish" (tipos altos por más tiempo) o "dovish" (apertura a recortes). Palabras clave a monitorear: "data-dependent", "restrictive", "neutral rate", "confident inflation is moving toward target".',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100', 'BTC/USD'],
    volatilityPips: '30–100+ pips',
  },

  'prelim benchmark payrolls revision': {
    category: 'Revisión Anual de Nóminas (Benchmark)',
    what: 'Revisión anual del BLS (Bureau of Labor Statistics) que ajusta retroactivamente todos los datos de nóminas de los últimos 12 meses para reflejar los registros reales de seguridad social (más completos que las encuestas mensuales). Si la revisión muestra que el empleo fue significativamente menor de lo reportado (revisión negativa), cambia completamente la narrativa del mercado laboral que ha estado guiando a la Fed durante todo el año. Una revisión negativa importante = la economía estaba más débil de lo que se pensaba = más justificación para recortes de la Fed.',
    affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'],
    volatilityPips: '20–70 pips',
  },

  'revised uom consumer sentiment': {
    category: 'Confianza del Consumidor UoM (Revisada)',
    what: 'Lectura definitiva de la encuesta de Confianza del Consumidor de la Universidad de Michigan, publicada 2 semanas después de la preliminar. Generalmente tiene menor impacto que la preliminar salvo revisiones importantes. El mercado lo usa para confirmar o descartar la señal de la lectura preliminar. Si la revisión sube respecto a la preliminar, el mercado interpreta que el consumidor está más confiado de lo inicialmente reportado.',
    affectedAssets: ['DXY', 'SPX500'],
    volatilityPips: '5–15 pips',
  },

  'revised uom inflation expectations': {
    category: 'Expectativas de Inflación UoM (Revisadas)',
    what: 'Revisión de las expectativas de inflación a 12 meses de los consumidores americanos. Generalmente confirma la lectura preliminar. Su importancia radica en que si las expectativas de inflación a largo plazo (5–10 años) suben de forma sostenida, la Fed puede verse forzada a actuar. Las expectativas de largo plazo de UoM fueron citadas explícitamente por la Fed durante el ciclo de subidas de 2022–2023.',
    affectedAssets: ['DXY', 'XAU/USD'],
    volatilityPips: '5–15 pips',
  },

  /* ── AUD ────────────────────────────────────────────────── */
  'cash rate': {
    category: 'Decisión de Tipos — RBA',
    what: 'Decisión oficial de la tasa de interés de referencia del Banco de la Reserva de Australia (RBA). Es el catalizador de mayor impacto para el AUD/USD. El RBA se reúne 11 veces al año. Una subida de tipos = AUD alcista por entrada de capital buscando rendimiento; una bajada = AUD bajista. El mercado analiza no solo la decisión (generalmente ya descontada) sino el comunicado y la conferencia de prensa posterior en busca de la dirección futura (forward guidance).',
    affectedAssets: ['AUD/USD', 'NZD/USD', 'XAU/USD', 'DXY'],
    volatilityPips: '40–90 pips',
  },

  'rba monetary policy statement': {
    category: 'Declaración de Política Monetaria — RBA',
    what: 'Comunicado trimestral completo del RBA que acompaña la decisión de tipos. Incluye proyecciones actualizadas de inflación y crecimiento (cuadro macroeconómico del RBA), evaluación del mercado laboral y pistas sobre futuros movimientos de tipos. Es el documento más detallado de la postura del RBA y puede mover el AUD más que la propia decisión de tipos si las proyecciones son sustancialmente diferentes a lo esperado por el mercado.',
    affectedAssets: ['AUD/USD', 'AUD/JPY', 'DXY', 'XAU/USD'],
    volatilityPips: '30–70 pips',
  },

  'rba rate statement': {
    category: 'Comunicado del RBA',
    what: 'Comunicado oficial que acompaña cada decisión de tipos del Banco de la Reserva de Australia. Más breve que el Policy Statement trimestral, explica el razonamiento detrás de la decisión y da señales sobre el sesgo futuro de la política monetaria. El mercado escanea frases clave: si el RBA dice "further tightening may be required" (hawkish) vs. "policy is sufficiently restrictive" (dovish). Puede mover el AUD significativamente incluso si la decisión de tipos era la esperada.',
    affectedAssets: ['AUD/USD', 'AUD/JPY', 'DXY'],
    volatilityPips: '25–60 pips',
  },

  'rba press conference': {
    category: 'Conferencia de Prensa — RBA',
    what: 'Rueda de prensa del Gobernador del RBA tras la decisión de tipos. Los periodistas formulan preguntas directas sobre la economía australiana, la inflación y el rumbo de los tipos. Las respuestas pueden aclarar o matizar el comunicado oficial. Volatilidad elevada durante los primeros 30 minutos. Los traders analizan el lenguaje corporal del discurso: uso de "if" vs. "when" en relación a futuros movimientos de tipos es muy informativo.',
    affectedAssets: ['AUD/USD', 'AUD/NZD', 'DXY', 'XAU/USD'],
    volatilityPips: '20–50 pips',
  },

  'wage price index q/q': {
    category: 'Índice de Precios Salariales — Australia',
    what: 'Medición trimestral del Australian Bureau of Statistics del crecimiento de los salarios en todos los sectores de la economía australiana. El RBA monitorea estrechamente este dato porque los salarios son el principal motor de la inflación de servicios. Si los salarios suben por encima del 3.5% interanual de forma sostenida, la inflación de servicios seguirá siendo resistente, lo que presiona al RBA a mantener tipos altos. Dato muy relevante para la política monetaria australiana.',
    affectedAssets: ['AUD/USD', 'DXY', 'XAU/USD'],
    volatilityPips: '20–45 pips',
  },

  'employment change': {
    category: 'Variación del Empleo',
    what: 'Mide la variación neta mensual del número de personas empleadas en el país. Publicado por el Australian Bureau of Statistics para Australia, incluye tanto empleo a tiempo completo como parcial (el de tiempo completo tiene mayor peso económico). El RBA usa este dato como uno de los dos pilares de su mandato (inflación + mercado laboral). Un empleo sólido aleja los recortes de tipos; una pérdida de empleos los acelera. El mercado reacciona especialmente si el mix entre tiempo completo y parcial es muy diferente al consenso.',
    affectedAssets: ['AUD/USD', 'DXY', 'XAU/USD'],
    volatilityPips: '30–70 pips',
  },

  'cpi m/m': {
    category: 'IPC Mensual',
    what: 'Variación mensual del Índice de Precios al Consumidor. Para la mayoría de los bancos centrales, el objetivo es inflación del 2% o cercana. Un dato m/m sorprendente al alza implica que la inflación está acelerando en el margen, lo que puede retrasar recortes de tipos y fortalecer la divisa local. Un dato a la baja sugiere que la política monetaria restrictiva está funcionando, abriendo la puerta a recortes que debilitan la divisa.',
    affectedAssets: ['AUD/USD', 'DXY', 'XAU/USD'],
    volatilityPips: '20–50 pips',
  },

  'cpi y/y': {
    category: 'IPC Interanual',
    what: 'Variación interanual del Índice de Precios al Consumidor. Es la medida de inflación de mayor referencia para comunicaciones de los bancos centrales y medios. Se compara con el objetivo del banco central (generalmente 2–3%). Una lectura muy por encima del objetivo sostiene los tipos altos; una lectura convergiendo hacia el objetivo abre la puerta a recortes.',
    affectedAssets: ['AUD/USD', 'DXY', 'XAU/USD'],
    volatilityPips: '20–55 pips',
  },

  'trimmed mean cpi m/m': {
    category: 'CPI Trimmed Mean (Núcleo Preferido del RBA)',
    what: 'El Trimmed Mean CPI es la medida de inflación subyacente preferida del Banco de la Reserva de Australia (RBA). Se calcula eliminando el 15% de los componentes con mayor y menor variación, para obtener la tendencia central de la inflación sin el ruido de los artículos más volátiles. El RBA tiene como objetivo un Trimmed Mean del 2–3% a largo plazo. Este dato puede tener más impacto en el AUD que el CPI titular porque es el que realmente guía las decisiones del RBA.',
    affectedAssets: ['AUD/USD', 'AUD/JPY', 'DXY', 'XAU/USD'],
    volatilityPips: '25–60 pips',
  },

  /* ── CAD ────────────────────────────────────────────────── */
  'ivey pmi': {
    category: 'PMI Ivey — Canadá',
    what: 'PMI elaborado por la Ivey Business School que encuesta a directores de compras de empresas canadienses sobre las condiciones de negocio actuales. Sobre 50 = expansión del sector empresarial; bajo 50 = contracción. A diferencia del ISM americano, incluye tanto manufacturas como servicios. Es uno de los indicadores económicos canadienses más seguidos del mes y puede mover el USD/CAD si diverge significativamente del consenso.',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '15–35 pips',
  },

  'median cpi y/y': {
    category: 'CPI Mediana Interanual — Canadá',
    what: 'Medida de inflación subyacente del Banco de Canadá (BoC) que toma el componente con variación en el punto exacto del percentil 50 de toda la distribución de precios. El BoC publica tres medidas de inflación subyacente (Common, Trim, Median) y las promedia para guiar sus decisiones de tipos. La Median CPI es menos sensible a outliers que el CPI titular, mostrando la tendencia estructural de la inflación canadiense.',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '20–45 pips',
  },

  'trimmed cpi y/y': {
    category: 'CPI Recortado Interanual — Canadá',
    what: 'Medida de inflación subyacente del BoC que elimina los componentes con variación extrema en los extremos de la distribución. Junto con la Median CPI y la Common CPI, forma el triplete de indicadores de inflación subyacente que el Banco de Canadá usa para determinar la tendencia real de la inflación, eliminando el ruido de los componentes volátiles (energía, precios estacionales). El BoC publica las tres simultáneamente.',
    affectedAssets: ['USD/CAD', 'DXY'],
    volatilityPips: '20–45 pips',
  },

  'common cpi y/y': {
    category: 'CPI Común Interanual — Canadá',
    what: 'Medida de inflación subyacente del BoC que captura los movimientos de precios comunes a todas las categorías del IPC, filtrando los movimientos específicos de categorías individuales. Es la más suavizada de las tres medidas de inflación subyacente del BoC. Las tres (Common, Trim, Median) se publican juntas y el mercado las analiza en conjunto para evaluar si la inflación subyacente canadiense converge hacia el objetivo del 2% del BoC.',
    affectedAssets: ['USD/CAD', 'DXY'],
    volatilityPips: '15–35 pips',
  },

  'gdp m/m': {
    category: 'PIB Mensual',
    what: 'Variación mensual del PIB. Canadá publica su PIB mensualmente (al contrario que EE.UU. que lo hace trimestralmente), lo que permite un seguimiento más granular de la economía. Un PIB mensual positivo sostenido confirma expansión económica; lecturas negativas consecutivas señalan riesgo de recesión. Statistics Canada publica este dato junto con la estimación Flash del mes siguiente. El mercado reacciona especialmente si la lectura diverge más de 0.2 puntos del consenso.',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '20–45 pips',
  },

  /* ── CHF ────────────────────────────────────────────────── */
  // CHF CPI m/m - uses generic 'cpi m/m' key above, but we need a CHF-specific one

  /* ── EUR ────────────────────────────────────────────────── */
  'ecb president lagarde speaks': {
    category: 'Discurso de la Presidenta del BCE',
    what: 'Intervención pública de Christine Lagarde, Presidenta del Banco Central Europeo. Sus declaraciones son el mayor catalizador de volatilidad para el EUR/USD, EUR/GBP y otros cruces del euro. El mercado analiza su lenguaje en busca de señales sobre el ritmo de recortes de tipos: palabras como "data-dependent", "gradual", "cautious" indican un BCE cauto; "confident" o "timely" sobre la reducción de la inflación sugieren apertura a recortes más rápidos. Un solo comentario puede mover el EUR/USD 50–80 pips en segundos.',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'EUR/JPY', 'DXY', 'XAU/USD'],
    volatilityPips: '20–80 pips',
  },

  'french flash manufacturing pmi': {
    category: 'PMI Manufacturero Francia (Flash)',
    what: 'Estimación preliminar (flash) del PMI manufacturero de Francia, publicada por S&P Global. Sobre 50 = expansión; bajo 50 = contracción. Francia es la segunda mayor economía de la Eurozona y su sector manufacturero tiene peso en el PIB europeo. Los datos flash de PMI son lecturas muy anticipadas del ciclo económico (se publican semanas antes de los datos oficiales). Una lectura muy por debajo de 50 refuerza las expectativas de recortes del BCE y presiona al EUR.',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '10–25 pips',
  },

  'french flash services pmi': {
    category: 'PMI Servicios Francia (Flash)',
    what: 'Estimación preliminar del PMI de servicios de Francia. El sector servicios domina la economía francesa y es clave para el empleo y el consumo. Si el PMI de servicios cae por debajo de 50, indica que incluso la parte más resiliente de la economía francesa se está contrayendo, lo que refuerza la presión sobre el BCE para recortar tipos más agresivamente. Los PMI flash europeos se publican todos el mismo día a primera hora de la mañana, creando ventanas de alta volatilidad en los cruces del EUR.',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '10–25 pips',
  },

  'german flash manufacturing pmi': {
    category: 'PMI Manufacturero Alemania (Flash)',
    what: 'Estimación preliminar del PMI manufacturero de Alemania — la mayor economía de la Eurozona y el mayor exportador de Europa. El sector manufacturero alemán (automóviles, maquinaria, química) es el corazón industrial de Europa. Un PMI manufacturero alemán persistentemente bajo 50 (como ocurrió durante 2023–2024) refleja la desindustrialización y pérdida de competitividad de la economía alemana, lo cual pesa estructuralmente sobre el EUR y aumenta la presión para recortes del BCE.',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'EUR/JPY', 'DXY'],
    volatilityPips: '15–35 pips',
  },

  'german flash services pmi': {
    category: 'PMI Servicios Alemania (Flash)',
    what: 'Estimación preliminar del PMI de servicios de Alemania. El sector servicios alemán ha sido más resiliente que el manufacturero en los últimos años, actuando como amortiguador de la recesión industrial. Si el PMI de servicios también cae bajo 50, la señal de recesión alemana se hace mucho más fuerte, lo que presiona al BCE a actuar con más celeridad. Se publica simultáneamente con los PMI de Francia y Eurozona, generando mucha volatilidad en los cruces del EUR.',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'DXY', 'XAU/USD'],
    volatilityPips: '15–35 pips',
  },

  /* ── GBP ────────────────────────────────────────────────── */
  'prelim gdp q/q': {
    category: 'PIB Trimestral Preliminar (Reino Unido)',
    what: 'Primera estimación del PIB trimestral del Reino Unido publicada por la ONS (Office for National Statistics). El PIB del RU es seguido de cerca por el Banco de Inglaterra (BoE) para calibrar su política monetaria. Una economía que crece más de lo esperado reduce la urgencia de recortar tipos (GBP alcista); una economía en recesión acelera los recortes (GBP bajista). El Reino Unido alternó entre crecimiento y contracción durante 2023–2024, lo que mantuvo al BoE en un equilibrio delicado.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '20–50 pips',
  },

  'claimant count change': {
    category: 'Solicitudes de Subsidio por Desempleo (RU)',
    what: 'Variación mensual del número de personas que solicitan beneficio por desempleo en el Reino Unido (equivalente al Jobless Claims de EE.UU.). Un aumento en las solicitudes es señal de deterioro del mercado laboral, lo que presiona al BoE a recortar tipos antes. Se publica junto al Average Earnings Index y es parte del paquete mensual de empleo del RU. El Claimant Count es más sensible a cambios recientes en el mercado laboral que la tasa de desempleo oficial (que tiene mayor lag).',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '20–45 pips',
  },

  'average earnings index 3m/y': {
    category: 'Índice de Salarios 3 Meses / Interanual (RU)',
    what: 'Mide el crecimiento interanual de los salarios medios en el RU sobre la media de los últimos 3 meses. El BoE lo considera el indicador más importante para evaluar la inflación de servicios, porque los salarios son el principal coste de las empresas de servicios y se trasladan directamente a los precios al consumidor. Salarios por encima del 5% interanual son preocupantes para el BoE porque implican que la inflación de servicios seguirá siendo resistente, limitando el ritmo de recortes. GBP alcista con datos de salarios altos.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '25–55 pips',
  },

  'retail sales m/m': {
    category: 'Ventas Minoristas Mensual',
    what: 'Variación mensual de las ventas en el comercio minorista. Mide el gasto del consumidor en bienes. Para el Reino Unido, las ventas minoristas son especialmente seguidas porque el consumo privado es el mayor componente del PIB. Una caída sostenida en las ventas minoristas refleja que el consumidor está presionado por los tipos altos (hipotecas) y la inflación. Impacto moderado en GBP salvo sorpresas grandes.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '15–35 pips',
  },

  'flash manufacturing pmi': {
    category: 'PMI Manufacturero RU (Flash)',
    what: 'Estimación preliminar mensual del PMI del sector manufacturero del Reino Unido elaborada por S&P Global. Sobre 50 = expansión; bajo 50 = contracción. El sector manufacturero del RU ha estado bajo presión desde el Brexit por las fricciones comerciales con la UE y el aumento de costes. Un PMI manufacturero débil refuerza las expectativas de recortes del BoE y presiona la libra esterlina.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '10–25 pips',
  },

  'flash services pmi': {
    category: 'PMI Servicios RU (Flash)',
    what: 'Estimación preliminar del PMI de servicios del Reino Unido. El sector servicios representa el ≈80% del PIB del RU, por lo que este PMI tiene más peso que el manufacturero para estimar el crecimiento económico. Si el PMI de servicios cae bajo 50, la probabilidad de recesión técnica en el RU aumenta considerablemente. El BoE monitorea este dato de cerca porque los servicios también son la principal fuente de la inflación subyacente en el RU.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY', 'XAU/USD'],
    volatilityPips: '15–35 pips',
  },

  /* ── JPY ────────────────────────────────────────────────── */
  'tokyo core cpi y/y': {
    category: 'IPC Subyacente Tokio — Indicador Adelantado del Japón',
    what: 'Variación interanual del IPC Subyacente de Tokio (excluyendo alimentos frescos). Es un indicador adelantado del IPC nacional de Japón porque Tokio publica sus datos antes que el promedio nacional. El BoJ (Banco de Japón) lo monitorea estrechamente en su objetivo de salir de la deflación y mantener una inflación estable alrededor del 2%. Un Tokyo Core CPI sólido refuerza las expectativas de que el BoJ continuará normalizando su política monetaria (subiendo tipos desde niveles negativos), lo que es alcista para el JPY. Con el BoJ en pleno proceso de normalización histórica en 2024–2025, este dato es especialmente relevante.',
    affectedAssets: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'DXY'],
    volatilityPips: '20–50 pips',
  },

  /* ── NZD ────────────────────────────────────────────────── */
  'employment change q/q': {
    category: 'Variación del Empleo Trimestral — Nueva Zelanda',
    what: 'Variación trimestral del empleo en Nueva Zelanda publicada por Statistics NZ. A diferencia de Australia y EE.UU. que publican datos mensuales, NZ publica empleo trimestralmente. El RBNZ (Banco de la Reserva de Nueva Zelanda) tiene un mandato explícito de apoyo al empleo máximo sostenible. Un dato de empleo débil aumenta la probabilidad de que el RBNZ recorte tipos, debilitando el NZD. El NZD también se ve afectado por el contexto de materias primas (commodities) dado que NZ es gran exportador agrícola.',
    affectedAssets: ['NZD/USD', 'AUD/NZD', 'DXY'],
    volatilityPips: '25–55 pips',
  },

  'inflation expectations q/q': {
    category: 'Expectativas de Inflación Trimestral — NZ',
    what: 'Encuesta trimestral del RBNZ a empresas sobre sus expectativas de inflación a 2 años. Es un dato de anticipación: si las empresas esperan más inflación en el futuro, tenderán a subir precios y salarios hoy, creando una profecía autocumplida. El RBNZ usa esta encuesta como uno de sus insumos para calibrar la política monetaria. Expectativas desancladas al alza = el RBNZ debe mantener tipos restrictivos más tiempo = NZD alcista a corto plazo.',
    affectedAssets: ['NZD/USD', 'AUD/NZD', 'DXY'],
    volatilityPips: '15–35 pips',
  },
};

/* ============================================================
   COUNTRY-SPECIFIC OVERRIDES
   For events whose name is identical across countries (e.g. "cpi m/m")
   but whose context should differ by country.
   Key format: "COUNTRY:event name"
   ============================================================ */
const COUNTRY_EVENT_MAP = {
  /* ── CPI m/m by country ── */
  'AUD:cpi m/m': {
    category: 'IPC Mensual — Australia',
    what: 'Variación mensual del IPC publicado por el Australian Bureau of Statistics. El RBA tiene un objetivo de inflación del 2–3% (banda, no punto exacto). Un CPI mensual sorprendente al alza retrasa los recortes del RBA y refuerza el AUD/USD. Dato especialmente relevante en el contexto de la normalización de la inflación post-pandemia en Australia.',
    affectedAssets: ['AUD/USD', 'AUD/JPY', 'DXY', 'XAU/USD'],
    volatilityPips: '20–50 pips',
  },
  'CAD:cpi m/m': {
    category: 'IPC Mensual — Canadá',
    what: 'Variación mensual del IPC de Canadá publicado por Statistics Canada. El Banco de Canadá (BoC) tiene objetivo de inflación del 2% (punto medio de la banda 1–3%). El BoC también publica simultáneamente tres medidas subyacentes (Common, Trim, Median). Un CPI m/m canadiense fuerte reduce la probabilidad de recortes del BoC, fortaleciendo el CAD (bajista para USD/CAD).',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '20–50 pips',
  },
  'CHF:cpi m/m': {
    category: 'IPC Mensual — Suiza',
    what: 'Variación mensual del IPC de Suiza publicado por el Bundesamt für Statistik. El SNB (Banco Nacional Suizo) tiene un objetivo de inflación inferior al 2%. Suiza históricamente tiene inflación muy baja (cercana a 0% o incluso deflación), por lo que cualquier lectura elevada es relevante. El SNB es conocido por intervenciones directas en el mercado de divisas para controlar la fortaleza del CHF. El USD/CHF y EUR/CHF reaccionan a este dato.',
    affectedAssets: ['USD/CHF', 'EUR/CHF', 'DXY'],
    volatilityPips: '15–40 pips',
  },
  'GBP:cpi y/y': {
    category: 'IPC Interanual — Reino Unido',
    what: 'Variación interanual del IPC del Reino Unido publicado por la ONS. El BoE tiene objetivo de inflación del 2%. Tras el pico del 11.1% en octubre de 2022 (el mayor desde 1981), el BoE subió tipos agresivamente. El regreso del CPI al objetivo 2% es la condición principal para que el BoE complete su ciclo de recortes. Lecturas persistentemente por encima del 3% limitan el margen del BoE y sostienen la GBP.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY', 'XAU/USD'],
    volatilityPips: '30–70 pips',
  },

  /* ── GDP m/m by country ── */
  'GBP:gdp m/m': {
    category: 'PIB Mensual — Reino Unido',
    what: 'Variación mensual del PIB del RU publicada por la ONS. El RU es el único país del G7 que publica PIB mensual además del trimestral, lo que permite seguimiento de alta frecuencia. Lecturas negativas consecutivas (dos meses o más) alertan sobre riesgo de recesión técnica. El BoE usa este dato como uno de los inputs clave para evaluar si la economía puede soportar tipos altos o si necesita estímulo.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '20–50 pips',
  },
  'CAD:gdp m/m': {
    category: 'PIB Mensual — Canadá',
    what: 'Variación mensual del PIB de Canadá publicada por Statistics Canada. Es el primer país del G7 en publicar PIB mensual (además del trimestral), lo que da visibilidad en tiempo real. El BoC usa este dato para calibrar si la economía canadiense se está frenando lo suficiente como para justificar recortes de tipos. Canadá tiene alta correlación con los precios del petróleo por ser gran exportador.',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '20–45 pips',
  },

  /* ── Employment Change by country ── */
  'AUD:employment change': {
    category: 'Variación del Empleo — Australia',
    what: 'Variación neta mensual del empleo en Australia publicada por el ABS (Australian Bureau of Statistics). Incluye empleo a tiempo completo y parcial. El tiempo completo tiene mayor peso económico. El RBA vigila este dato en su mandato de pleno empleo. Un mercado laboral australiano sólido aleja los recortes del RBA (AUD alcista); deterioro del empleo los acelera (AUD bajista).',
    affectedAssets: ['AUD/USD', 'AUD/JPY', 'DXY', 'XAU/USD'],
    volatilityPips: '30–70 pips',
  },
  'CAD:employment change': {
    category: 'Variación del Empleo — Canadá',
    what: 'Variación neta mensual del empleo en Canadá publicada por Statistics Canada. Se publica el mismo día que el NFP americano (primer viernes del mes), lo que genera doble volatilidad en el USD/CAD. El BoC considera el mercado laboral uno de sus indicadores clave. Un dato canadiense muy diferente al NFP puede crear movimientos explosivos en el USD/CAD.',
    affectedAssets: ['USD/CAD', 'DXY', 'OIL'],
    volatilityPips: '25–65 pips',
  },
  'NZD:employment change q/q': {
    category: 'Variación del Empleo Trimestral — Nueva Zelanda',
    what: 'Variación trimestral del empleo en Nueva Zelanda publicada por Statistics NZ. El RBNZ tiene mandato explícito de apoyar el empleo máximo sostenible junto con la estabilidad de precios. Los datos de empleo en NZ se publican trimestralmente (no mensualmente como en AUS o EE.UU.), por lo que cada publicación tiene mayor peso. NZD muy sensible a estos datos.',
    affectedAssets: ['NZD/USD', 'AUD/NZD', 'DXY'],
    volatilityPips: '25–55 pips',
  },

  /* ── Unemployment Rate by country ── */
  'AUD:unemployment rate': {
    category: 'Tasa de Desempleo — Australia',
    what: 'Tasa de desempleo de Australia publicada por el ABS. Históricamente el mercado laboral australiano ha sido resiliente. El RBA considera una tasa del 4–4.5% compatible con el pleno empleo. Si la tasa sube por encima del 4.5% de forma sostenida, el RBA tiene argumento para recortar tipos más agresivamente. Se publica simultáneamente con Employment Change.',
    affectedAssets: ['AUD/USD', 'DXY', 'XAU/USD'],
    volatilityPips: '20–55 pips',
  },
  'CAD:unemployment rate': {
    category: 'Tasa de Desempleo — Canadá',
    what: 'Tasa de desempleo de Canadá. Se publica el mismo día que el NFP americano. El BoC considera una tasa del 5–6% compatible con el pleno empleo canadiense. Si diverge significativamente del consenso, puede generar movimientos fuertes en el USD/CAD, especialmente cuando el NFP americano ya ha movido el USD.',
    affectedAssets: ['USD/CAD', 'DXY'],
    volatilityPips: '20–50 pips',
  },
  'NZD:unemployment rate': {
    category: 'Tasa de Desempleo — Nueva Zelanda',
    what: 'Tasa de desempleo trimestral de Nueva Zelanda. El RBNZ tiene un mandato dual (inflación + empleo máximo sostenible). El nivel considerado compatible con el pleno empleo en NZ está alrededor del 4–4.5%. Una tasa subiendo por encima de este nivel refuerza la narrativa dovish del RBNZ.',
    affectedAssets: ['NZD/USD', 'AUD/NZD', 'DXY'],
    volatilityPips: '20–45 pips',
  },

  /* ── Prelim GDP q/q ── */
  'GBP:prelim gdp q/q': {
    category: 'PIB Trimestral Preliminar — Reino Unido',
    what: 'Primera estimación trimestral del PIB del RU por la ONS. El mercado reacciona a la comparación vs. consenso: una economía más fuerte de lo esperado limita los recortes del BoE (GBP alcista); una contracción inesperada los acelera. El sector servicios domina el PIB del RU (≈80%), por lo que el PIB de servicios tiene mayor peso en la lectura que el manufacturero.',
    affectedAssets: ['GBP/USD', 'EUR/GBP', 'DXY'],
    volatilityPips: '20–50 pips',
  },
};

/* ============================================================
   MAIN CONTEXT FUNCTION
   Lookup priority:
   1. Country+EventName compound key (COUNTRY_EVENT_MAP)
   2. EventName-only exact key (EVENT_CONTEXT_MAP)
   3. Partial name match in EVENT_CONTEXT_MAP
   4. Category keyword fallback
   ============================================================ */
export function getMacroImpactContext(eventName = '', country = 'USD', impact = 'HIGH') {
  const n = eventName.toLowerCase().trim();

  // 1 ── Country-specific compound key (most precise)
  const compoundKey = `${country}:${n}`;
  if (COUNTRY_EVENT_MAP[compoundKey]) {
    return COUNTRY_EVENT_MAP[compoundKey];
  }

  // 2 ── Event-name exact match
  if (EVENT_CONTEXT_MAP[n]) {
    return EVENT_CONTEXT_MAP[n];
  }

  // 3 ── Partial name match
  for (const [key, ctx] of Object.entries(EVENT_CONTEXT_MAP)) {
    if (n.includes(key) || key.includes(n)) {
      return ctx;
    }
  }

  // 4 ── Category keyword fallback
  return _categoryFallback(n, country, impact);
}

/* ============================================================
   CATEGORY KEYWORD FALLBACK
   Used only for events not covered by EVENT_CONTEXT_MAP
   ============================================================ */
function _categoryFallback(n, country, impact) {

  if (n.includes('rate') || n.includes('tasa') || n.includes('fomc') || n.includes('ecb') ||
      n.includes('boe') || n.includes('boj') || n.includes('monetary policy') || n.includes('minutes')) {
    return {
      category: 'Política Monetaria',
      what: `Decisión o comunicado de política monetaria de ${country}. Define el costo del dinero y guía las expectativas del mercado sobre futuros movimientos de tipos de interés.`,
      affectedAssets: country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'] : [`${country}/USD`, 'DXY', 'XAU/USD'],
      volatilityPips: '50–150 pips',
    };
  }

  if (n.includes('cpi') || n.includes('ipc') || n.includes('pce') || n.includes('inflation') ||
      n.includes('ppi') || n.includes('price index')) {
    return {
      category: 'Inflación',
      what: `Dato de inflación de ${country}. Compara el nivel de precios actual con el periodo anterior. Resultado por encima del objetivo del banco central = presión para mantener tipos altos = ${country} más fuerte.`,
      affectedAssets: country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'] : [`${country}/USD`, 'DXY', 'XAU/USD'],
      volatilityPips: impact === 'HIGH' ? '35–80 pips' : '10–35 pips',
    };
  }

  if (n.includes('employment') || n.includes('payroll') || n.includes('jobless') ||
      n.includes('unemployment') || n.includes('labour') || n.includes('labor')) {
    return {
      category: 'Mercado Laboral',
      what: `Dato del mercado laboral de ${country}. El empleo es uno de los mandatos principales de los bancos centrales. Lecturas sólidas alejan los recortes de tipos y fortalecen la divisa.`,
      affectedAssets: country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500'] : [`${country}/USD`, 'DXY'],
      volatilityPips: impact === 'HIGH' ? '30–80 pips' : '10–30 pips',
    };
  }

  if (n.includes('gdp') || n.includes('pib') || n.includes('growth')) {
    return {
      category: 'Crecimiento Económico (PIB)',
      what: `PIB de ${country}: mide el valor total de bienes y servicios producidos. Es el indicador más amplio de la salud económica. Una sorpresa positiva reduce las expectativas de recortes de tipos.`,
      affectedAssets: country === 'USD' ? ['DXY', 'SPX500', 'EUR/USD'] : [`${country}/USD`, 'DXY'],
      volatilityPips: impact === 'HIGH' ? '25–60 pips' : '10–25 pips',
    };
  }

  if (n.includes('pmi') || n.includes('manufacturing') || n.includes('services')) {
    return {
      category: 'PMI / Actividad Económica',
      what: `PMI o índice de actividad sectorial de ${country}. Sobre 50 = expansión; bajo 50 = contracción. Indica la dirección de la economía semanas antes que los datos oficiales del PIB.`,
      affectedAssets: country === 'USD' ? ['DXY', 'SPX500', 'EUR/USD'] : [`${country}/USD`, 'DXY'],
      volatilityPips: impact === 'HIGH' ? '15–40 pips' : '5–20 pips',
    };
  }

  if (n.includes('retail') || n.includes('consumer') || n.includes('sentiment')) {
    return {
      category: 'Consumo & Confianza',
      what: `Dato de consumo o confianza del consumidor de ${country}. El gasto del consumidor es el mayor componente del PIB en economías desarrolladas.`,
      affectedAssets: country === 'USD' ? ['DXY', 'SPX500', 'EUR/USD'] : [`${country}/USD`, 'DXY'],
      volatilityPips: impact === 'HIGH' ? '15–35 pips' : '5–15 pips',
    };
  }

  // Generic final fallback
  return {
    category: 'Indicador Económico',
    what: `Publicación macroeconómica de ${country}. Un resultado mejor de lo esperado tiende a fortalecer la divisa y los activos de riesgo relacionados; peor de lo esperado genera presión vendedora.`,
    affectedAssets: country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD'] :
                    country === 'EUR' ? ['EUR/USD', 'DXY'] :
                    country === 'GBP' ? ['GBP/USD', 'DXY'] :
                    country === 'JPY' ? ['USD/JPY', 'DXY'] :
                    country === 'CHF' ? ['USD/CHF', 'EUR/CHF', 'DXY'] :
                    country === 'CAD' ? ['USD/CAD', 'DXY', 'OIL'] :
                    country === 'AUD' ? ['AUD/USD', 'DXY', 'XAU/USD'] :
                    country === 'NZD' ? ['NZD/USD', 'DXY'] :
                    [`${country}/USD`, 'DXY'],
    volatilityPips: impact === 'HIGH' ? '20–50 pips' : '5–20 pips',
  };
}

/* ============================================================
   DATA FETCHER
   ============================================================ */
export async function fetchCalendarEvents() {
  try {
    const { data: events, error } = await supabase
      .from(DB_TABLES.ECONOMIC_CALENDAR)
      .select('*')
      .order('event_time', { ascending: true });

    if (error) throw error;

    if (Array.isArray(events) && events.length > 0) {
      try { sessionStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(events)); } catch (_) {}
      return events;
    }
  } catch (err) {
    console.warn('[AEON] fetchCalendarEvents error, using cache:', err.message);
  }

  try {
    const cached = sessionStorage.getItem(CALENDAR_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  return [];
}
