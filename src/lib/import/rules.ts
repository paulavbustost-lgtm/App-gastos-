import type { Category } from '../../types'
import { normalizeKey } from './text'

/**
 * Reglas base: fragmento del comercio → categoría. Se evalúan de la más
 * específica a la más general, así "MC DONALDS" gana sobre "DONAL".
 * Son un punto de partida; lo que la persona corrige manda por sobre esto.
 */
const SEED_RULES: [string, string][] = [
  // Supermercado y almacén
  ['JUMBO', 'supermercado'],
  ['LIDER', 'supermercado'],
  ['SANTA ISABEL', 'supermercado'],
  ['UNIMARC', 'supermercado'],
  ['TOTTUS', 'supermercado'],
  ['ACUENTA', 'supermercado'],
  ['MAYORISTA 10', 'supermercado'],
  ['ALVI', 'supermercado'],
  ['ALMACEN', 'supermercado'],
  ['MINIMARKET', 'supermercado'],
  ['BOTILLE', 'supermercado'],
  ['VERDULERIA', 'supermercado'],
  ['CARNICERIA', 'supermercado'],
  ['SUPERME', 'supermercado'],

  // Comida y salidas
  ['RAPPI', 'comida'],
  ['UBER EATS', 'comida'],
  ['PEDIDOSYA', 'comida'],
  ['JUSTO', 'comida'],
  ['MC DONALDS', 'comida'],
  ['MCDONALD', 'comida'],
  ['BURGER KING', 'comida'],
  ['STARBUCKS', 'comida'],
  ['SBX', 'comida'],
  ['JUAN VALDEZ', 'comida'],
  ['DUNKIN', 'comida'],
  ['SUBWAY', 'comida'],
  ['DOMINO', 'comida'],
  ['PAPA JOHN', 'comida'],
  ['TELEPIZZA', 'comida'],
  ['KFC', 'comida'],
  ['DOGGIS', 'comida'],
  ['CAFE', 'comida'],
  ['RESTAURANT', 'comida'],
  ['SUSHI', 'comida'],
  ['PIZZ', 'comida'],
  ['SANGUCHE', 'comida'],
  ['FUENTE DE SODA', 'comida'],
  ['GASTRONOMICA', 'comida'],
  ['GASTRONOM', 'comida'],
  ['HELADER', 'comida'],
  ['PASTELER', 'comida'],
  ['PANADER', 'comida'],
  ['EMPORIO', 'comida'],
  ['BAR ', 'comida'],

  // Transporte
  ['UBER', 'transporte'],
  ['CABIFY', 'transporte'],
  ['DIDI', 'transporte'],
  ['BEAT', 'transporte'],
  ['COPEC', 'transporte'],
  ['SHELL', 'transporte'],
  ['PETROBRAS', 'transporte'],
  ['ARAMCO', 'transporte'],
  ['ENEX', 'transporte'],
  ['PRONTO', 'transporte'],
  ['UPA', 'transporte'],
  ['PARKING', 'transporte'],
  ['PARK', 'transporte'],
  ['ESTACIONAMIENTO', 'transporte'],
  ['TRAVEL', 'transporte'],
  ['SKY AIRL', 'transporte'],
  ['AUTOPISTA', 'transporte'],
  ['COSTANERA NORTE', 'transporte'],
  ['VESPUCIO', 'transporte'],
  ['TAG ', 'transporte'],
  ['METRO DE SANTIAGO', 'transporte'],
  ['BIP', 'transporte'],
  ['LATAM', 'transporte'],
  ['SKY AIRLINE', 'transporte'],
  ['JETSMART', 'transporte'],
  ['TURBUS', 'transporte'],
  ['PULLMAN', 'transporte'],

  // Salud
  ['CRUZ VERDE', 'salud'],
  ['SALCOBRAND', 'salud'],
  ['FARMACIA', 'salud'],
  ['AHUMADA', 'salud'],
  // La cartola corta los nombres a ~20 caracteres: "AHUM L272" es Ahumada.
  ['AHUM', 'salud'],
  ['DR SIMI', 'salud'],
  ['CLINICA', 'salud'],
  ['INTEGRAMEDICA', 'salud'],
  ['REDSALUD', 'salud'],
  ['MEGASALUD', 'salud'],
  ['DENTAL', 'salud'],
  ['OPTICA', 'salud'],
  ['LABORATORIO', 'salud'],
  ['CONSULTA MEDICA', 'salud'],
  ['KINESIO', 'salud'],

  // Suscripciones y servicios digitales
  ['NETFLIX', 'suscripciones'],
  ['SPOTIFY', 'suscripciones'],
  ['PRIME VIDEO', 'suscripciones'],
  ['AMAZON PRIME', 'suscripciones'],
  ['DISNEY', 'suscripciones'],
  ['HBO', 'suscripciones'],
  ['MAX ', 'suscripciones'],
  ['APPLE', 'suscripciones'],
  ['ITUNES', 'suscripciones'],
  ['GOOGLE', 'suscripciones'],
  ['YOUTUBE', 'suscripciones'],
  ['MICROSOFT', 'suscripciones'],
  ['OPENAI', 'suscripciones'],
  ['ANTHROPIC', 'suscripciones'],
  ['CLAUDE', 'suscripciones'],
  ['CANVA', 'suscripciones'],
  ['DROPBOX', 'suscripciones'],
  ['PARAMOUNT', 'suscripciones'],
  ['CRUNCHYROLL', 'suscripciones'],

  // Hogar y cuentas
  ['ENEL', 'hogar'],
  ['CGE', 'hogar'],
  ['AGUAS ANDINAS', 'hogar'],
  ['ESSBIO', 'hogar'],
  ['METROGAS', 'hogar'],
  ['LIPIGAS', 'hogar'],
  ['ABASTIBLE', 'hogar'],
  ['GASCO', 'hogar'],
  ['ENTEL', 'hogar'],
  ['MOVISTAR', 'hogar'],
  ['CLARO', 'hogar'],
  ['WOM', 'hogar'],
  ['VTR', 'hogar'],
  ['GTD', 'hogar'],
  ['MUNDO PACIFICO', 'hogar'],
  ['SODIMAC', 'hogar'],
  ['EASY', 'hogar'],
  ['CONSTRUMART', 'hogar'],
  ['HOMECENTER', 'hogar'],
  ['IKEA', 'hogar'],
  ['CASA IDEAS', 'hogar'],
  ['CASAIDEAS', 'hogar'],
  ['LAVAMAX', 'hogar'],
  ['LAVANDERIA', 'hogar'],
  ['SEGUROS', 'hogar'],
  ['SEGURO', 'hogar'],
  ['GASTOS COMUNES', 'hogar'],

  // Ropa
  ['FALABELLA', 'ropa'],
  ['PARIS', 'ropa'],
  ['RIPLEY', 'ropa'],
  ['H&M', 'ropa'],
  ['H M ALTO', 'ropa'],
  ['ZARA', 'ropa'],
  ['BIMBA Y LOLA', 'ropa'],
  ['MANGO', 'ropa'],
  ['ADIDAS', 'ropa'],
  ['NIKE', 'ropa'],
  ['PUMA', 'ropa'],
  ['FORUS', 'ropa'],
  ['TRICOT', 'ropa'],
  ['CORONA', 'ropa'],
  ['DECATHLON', 'ropa'],
  ['GLAM', 'ropa'],
  ['BELSPORT', 'ropa'],
  ['BIMBAYLOLA', 'ropa'],

  // Ocio
  ['CINE', 'ocio'],
  ['CINEPOLIS', 'ocio'],
  ['CINEMARK', 'ocio'],
  ['HOYTS', 'ocio'],
  ['TEATRO', 'ocio'],
  ['PUNTOTICKET', 'ocio'],
  ['TICKETMASTER', 'ocio'],
  ['PASSLINE', 'ocio'],
  ['PASS LINE', 'ocio'],
  ['MUSEO', 'ocio'],
  ['STEAM', 'ocio'],
  ['PLAYSTATION', 'ocio'],
  ['NINTENDO', 'ocio'],
  ['XBOX', 'ocio'],
  ['GIMNASIO', 'ocio'],
  ['GYM', 'ocio'],
  ['SMART FIT', 'ocio'],
  ['ENERGY FITNESS', 'ocio'],
  ['PACIFIC FITNESS', 'ocio'],

  // Mascotas
  ['PETVET', 'mascotas'],
  ['VETERINARIA', 'mascotas'],
  ['PET ', 'mascotas'],
  ['MASCOTA', 'mascotas'],

  // Educación
  ['LIBRERIA', 'educacion'],
  ['UNIVERSIDAD', 'educacion'],
  ['COLEGIO', 'educacion'],
  ['UDEMY', 'educacion'],
  ['COURSERA', 'educacion'],
  ['PLATZI', 'educacion'],

  // Cargos del banco
  ['COMISION', 'banco'],
  ['IMPUESTO', 'banco'],
  ['INTERES', 'banco'],
  ['MANTENCION', 'banco'],
  ['DECRETO LEY', 'banco'],
]

// Las reglas más largas primero: gana la coincidencia más específica.
const ORDERED_RULES = [...SEED_RULES].sort((a, b) => b[0].length - a[0].length)

/**
 * Elige categoría para un comercio. Las reglas aprendidas (lo que la persona
 * ya corrigió antes) tienen prioridad sobre las de fábrica.
 */
export function suggestCategory(
  merchant: string,
  categories: Category[],
  learned: Record<string, string> = {},
): string {
  const key = normalizeKey(merchant)
  const valid = new Set(categories.map((c) => c.id))

  // Coincidencia exacta de algo ya corregido.
  if (learned[key] && valid.has(learned[key])) return learned[key]

  // Coincidencia parcial aprendida, la más específica primero.
  const learnedKeys = Object.keys(learned).sort((a, b) => b.length - a.length)
  for (const k of learnedKeys) {
    if (k && key.includes(k) && valid.has(learned[k])) return learned[k]
  }

  for (const [needle, categoryId] of ORDERED_RULES) {
    if (key.includes(normalizeKey(needle)) && valid.has(categoryId)) return categoryId
  }

  const fallback = categories.find((c) => c.id === 'otros' && c.type === 'gasto')
  return fallback?.id ?? categories.find((c) => c.type === 'gasto')?.id ?? ''
}

/** Registra una corrección para que la próxima importación llegue mejor. */
export function learnRule(
  learned: Record<string, string>,
  merchant: string,
  categoryId: string,
): Record<string, string> {
  const key = normalizeKey(merchant)
  if (!key) return learned
  return { ...learned, [key]: categoryId }
}
