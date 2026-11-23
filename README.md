# Haven — Home OS

A calm, single-purpose Home Assistant dashboard for **security cameras**, **air conditioners**
and **weather**. SvelteKit 2/Svelte 5, Tailwind v4 and shadcn-svelte, talking to a local Home
Assistant over its REST + WebSocket APIs.

Built to the `home-assistante-dashboard.pen` mockup: Inter, `#FAFAFA` surfaces, 1px `#E5E5E5`
borders, 10px cards, near-black `#171717` primary, lucide icons, light theme only.

## What it does

One screen, four things:

| Area | Contents |
| --- | --- |
| **Camera** | Live MJPEG feed with snapshot fallback, full-screen expand, `…` menu for snapshot / entity ID / HA history |
| **Weather** | Current conditions, hourly strip, humidity-wind-sunset stats, 3-day forecast |
| **Climate** | AC cards — power, ±1° target, six modes, seven fan speeds, preset/swing detail sheet |
| **Layout** | One 12-column grid: drag the ⋮⋮ grip on **any** card to move it, use its ⋮ menu to resize it or remove it |

Climate control is complete: power, ±1° target (18–32 °C), six HVAC modes, seven fan speeds,
eco/boost presets and swing modes in a detail sheet.

## Arranging the dashboard

Every card lives in a single 12-column grid that fills its own rows:

- **Move** — drag the ⋮⋮ grip at the left of any card and drop it on another card. The camera can
  sit under the ACs, the weather can come first, anything goes.
- **Resize** — the ⋮ menu offers the widths that make sense for that card: the camera goes
  Half / Two-thirds / Full, weather Third / Half, an AC Quarter / Third / Half / Full.
- **Remove** — same menu, or unpin it in **Add device**.

Order and width are saved to `data/pinned.json` on the server, so they follow you between devices.
Below 768px every card goes full width and stacks.

## Read this before deploying

- **No authentication.** The dashboard trusts anyone who can reach it. Keep it on your LAN, or
  put it behind a reverse proxy that authenticates.
- **The token is server-side only.** The browser never sees it; every HA call is proxied by
  SvelteKit server routes.
- The app **only reads** entity state, plus calls the services you trigger from the UI.

## Setup

```bash
cp .env.example .env
```

Fill in `.env`:

```dotenv
HA_URL=http://192.168.3.2:8123        # reachable from the machine running Haven
HA_TOKEN=...                          # HA → Profile → Security → Long-lived access tokens
HA_PUBLIC_URL=http://umbrel.local:8123 # browser-facing URL, used for deep links
HAVEN_DATA_DIR=data                   # where pinned.json lives
```

`HA_URL` must be an address the *server* can reach. Inside Docker, `localhost` is the
container, so use the host's LAN IP.

```bash
npm install
npm run dev      # http://localhost:5173
```

Production:

```bash
npm run build
npm start        # node --env-file-if-exists=.env build
```

## Docker on Umbrel

```bash
docker compose up -d --build
# → http://<umbrel-ip>:3000
```

`data/` on the host holds `pinned.json`. To appear in Umbrel's app grid, add an `umbrel-app.yml`
manifest pointing at this image and port; nothing in the app needs to change.

## Architecture

```
Browser ──SSE──►  SvelteKit server  ──WS──►  Home Assistant
        ──POST─►                    ──REST─►
```

- `src/lib/server/ha.ts` — REST client (states, services, forecasts, camera proxies).
- `src/lib/server/ha-ws.ts` — one long-lived WebSocket: auth, request/response, `state_changed`.
- `src/lib/server/state-store.ts` — authoritative entity map, batched fan-out, area registry cache.
- `src/routes/api/state` — SSE stream: `snapshot`, `changes`, `status`.
- `src/routes/api/camera/[entity]/stream` — MJPEG passthrough (snapshot route alongside).

### API

| Route | Purpose |
| --- | --- |
| `GET /api/state` | SSE: initial snapshot, then batched entity deltas |
| `GET /api/registry` | Areas, devices, entity registry (room names and models) |
| `GET /api/forecast?entity=weather.home` | Daily + hourly forecast (10 min cache) |
| `GET /api/camera/:entity/snapshot` | JPEG still |
| `GET /api/camera/:entity/stream` | `multipart/x-mixed-replace` live feed |
| `POST /api/service/:domain/:service` | Allow-listed Home Assistant service call |
| `GET\|PUT /api/layout` | Pinned entity layout |
| `GET /api/health` | Connection status + entity summary |

## Notes on your hardware

Verified against a real instance (HA 2026.11.2, America/São_Paulo):

- **1 camera** — TP-Link C200 in the Laundry. MJPEG and snapshots both work; there is no person
  detection entity, and motion detection is off.
- **4 Daikin units** — all six HVAC modes, seven fan speeds, `none/eco/boost` presets, three
  swing modes, 18–32 °C at 1° steps. No per-unit energy sensor and no schedule entities, so the
  mockup's `1.2 kWh today` / `18:00 – 23:30` footer became the live preset/swing state and room
  temperature.
- **Weather** — `weather.home` via met.no, with 7-day daily and hourly forecasts. The mockup's
  "Feels like" is dew point (met.no gives no apparent temperature here).
- **6 areas** in HA, used only to label each AC card with its room.
- Daikin occasionally reports `temperature: null` while it re-polls; the card renders `—` rather
  than a bogus 0 °C.

## Scripts

```bash
npm run dev        # dev server with HMR
npm run build      # production build (adapter-node)
npm start          # run the build
npm run check      # svelte-check
```
