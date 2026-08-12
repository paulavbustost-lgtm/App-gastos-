# Mis gastos

App web para controlar gastos personales. Anotas lo que gastaste en dos toques y ves en qué se te
va la plata, con presupuesto por período y gráficos.

Funciona en el teléfono como una app: se instala desde el navegador ("Agregar a pantalla de inicio")
y abre sin conexión. **Todos los datos se guardan solo en tu dispositivo** — no hay cuenta, servidor
ni sincronización.

## Qué hace

- **Registro rápido**: monto, categoría, detalle, fecha y medio de pago. Gastos e ingresos.
- **Períodos con día de corte**: mes calendario, o desde el día que te pagan (ej: del 25 al 24).
- **Presupuesto** por período y topes por categoría, con aviso cuando vas gastando muy rápido para
  lo que queda del mes.
- **Análisis**: gasto por período (últimos 6), desglose por categoría, promedio diario, proyección
  al cierre y reparto por medio de pago.
- **Buscador y filtros** por texto, tipo y categoría, sobre el período o todo el historial.
- **Categorías propias**: agregar, archivar y restaurar, con emoji y color.
- **Respaldos**: exportar a JSON (para restaurar) o a CSV (para abrir en Excel), e importar de vuelta.
- **Tema claro/oscuro** automático o fijo, y moneda configurable (CLP por defecto).

## Cómo correrla

```bash
npm install
npm run dev      # desarrollo, en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve el build compilado
npm test         # tests unitarios
npm run lint     # linter
```

Requiere Node 20 o superior.

## Publicarla en internet

El repo trae un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que compila y publica en
GitHub Pages en cada push a `main`. Para activarlo, una sola vez: **Settings → Pages → Source →
GitHub Actions**. Después queda en `https://<usuario>.github.io/<repo>/`, lista para abrir en el
teléfono e instalar.

El build usa rutas relativas (`base: './'`), así que también sirve desde cualquier hosting estático
(Netlify, Vercel, Cloudflare Pages) subiendo la carpeta `dist/`.

## Cómo está armada

Sin backend ni dependencias de UI: React + TypeScript sobre Vite, y CSS propio.

```
src/
  lib/        date.ts (períodos y día de corte), stats.ts (agregaciones),
              format.ts (moneda y parseo de montos), storage.ts (localStorage),
              csv.ts, draft.ts
  hooks/      useStore.ts (estado + persistencia), useTheme.ts
  components/ formulario, lista, medidor de presupuesto, gráficos, hoja modal
  views/      Resumen, Movimientos, Análisis, Ajustes
public/       manifest, service worker e íconos
scripts/      make-icons.mjs — genera los PNG del ícono (npm run icons)
```

El estado vive en `localStorage` bajo `app-gastos:state`, versionado y normalizado al leerlo, así un
archivo corrupto o antiguo no rompe la app. Las pestañas abiertas del mismo navegador se mantienen
sincronizadas.

Los tests cubren la parte con reglas de verdad: aritmética de períodos con día de corte, parseo de
montos escritos a mano (`12.500`, `1.234,56`, `$ 9.990`) y las agregaciones.

### Colores de los gráficos

La paleta sigue una referencia validada para daltonismo y contraste: ocho tonos categóricos en orden
fijo (`src/data/categories.ts`), un solo tono azul para magnitud, y colores de estado reservados para
el medidor de presupuesto. Cada barra va etiquetada con nombre y monto, así el color nunca es el
único canal de identidad. Los valores oscuros son pasos elegidos para la superficie oscura, no una
inversión automática de los claros.

## Límites conocidos

- Los datos viven en el navegador del dispositivo. Si borras los datos del sitio o cambias de
  teléfono, se pierden: usa **Ajustes → Respaldo**.
- No hay gastos recurrentes automáticos ni conexión con el banco; todo se anota a mano.
- Un solo perfil por dispositivo, sin gastos compartidos entre personas.
