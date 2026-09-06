# QR Visit Tracker

**Serverless návštěvnostní tracker pro QR kódové kampaně.** Bez cookies, bez Google Analytics, bez externích trackerů. Běží na Cloudflare Pages + KV Storage.

Živé ukázky:
- 🇨🇿 [neskenuj.me](https://neskenuj.me)
- 🇬🇧 [scanresponsibly.it](https://scanresponsibly.it)

---

## Co to dělá

Po naskenování QR kódu stránka:

1. Vytvoří **fingerprint** zařízení z technických parametrů prohlížeče (SHA-256 hash)
2. Zaznamená návštěvu do KV s typem zařízení, OS a zemí původu
3. Zobrazí návštěvníkovi co o sobě prozradil — edukační účel
4. Zaznamenává statistiky per kampaň pokud přišel přes UTM parametr

---

## Architektura

```
neskenuj.me/
├── index.html              # Hlavní edukační stránka
├── script.js               # Frontend logika (fingerprint, detekce, grafy)
├── charts.js               # Sdílené grafové funkce (Chart.js)
├── styles.css              # Styly (dark/light mode)
├── admin/
│   └── index.html          # Admin dashboard (chráněno CF Access)
├── kampan/
│   └── index.html          # Veřejné výsledky kampaně (/kampan/{slug})
└── functions/
    └── api/
        ├── visit.js                    # POST /api/visit
        ├── stats.js                    # GET  /api/stats
        ├── device-stats.js             # GET  /api/device-stats
        ├── campaigns/
        │   └── [[slug]].js             # GET/POST /api/campaigns[/{slug}]
        └── admin/
            └── logs.js                 # GET  /api/admin/logs
```

---

## KV Namespaces

Projekt používá tři KV namespaces:

| Binding | Účel |
|---|---|
| `VISIT_COUNTER` | Agregované čítače (total, dnes, device, OS, country, boti) |
| `VISIT_LOGS` | Detailní logy návštěv (TTL 90 dní) |
| `CAMPAIGNS` | Metadata a statistiky kampaní |

### Schéma klíčů VISIT_COUNTER

```
total                           → celkový počet unikátních návštěvníků
YYYY-MM-DD                      → návštěvníci za daný den
fp:YYYY-MM-DD:{fingerprint}     → TTL 48h, pro deduplikaci
device-{mobile|desktop}-total   → breakdown dle zařízení
device-{mobile|desktop}-{datum} → breakdown dle zařízení per den
os-{android|ios|windows|mac|linux}-total
country-{mobile|desktop}-{CC}   → ISO 3166-1 alpha-2
bot-total                       → detekované boty celkem
bot-YYYY-MM-DD                  → boty za den
```

### Schéma klíčů CAMPAIGNS

```
campaign:{slug}                     → { name, description, startDate, createdAt }
campaign-hits:{slug}                → celkový počet skenování
campaign-day:{slug}:YYYY-MM-DD      → skenování per den
campaign-device:{slug}:{mobile|desktop}
campaign-country:{slug}:{CC}
```

---

## API Endpointy

### Veřejné

| Metoda | Endpoint | Popis |
|---|---|---|
| `POST` | `/api/visit` | Zaznamenat návštěvu |
| `GET` | `/api/stats` | Agregované statistiky + grafy |
| `GET` | `/api/campaigns/{slug}` | Veřejné výsledky kampaně |

### Admin (vyžadují CF Access nebo X-Admin-Token hlavičku)

| Metoda | Endpoint | Popis |
|---|---|---|
| `GET` | `/api/campaigns` | Seznam všech kampaní |
| `POST` | `/api/campaigns` | Vytvořit novou kampaň |
| `GET` | `/api/admin/logs` | Log návštěv s filtrováním |

#### POST /api/visit

```json
{
  "fingerprint": "sha256hex64znaků",
  "deviceType": "mobile|desktop|unknown",
  "os": "android|ios|windows|mac|linux|unknown",
  "isBot": false,
  "utm_campaign": "slug8znaků"
}
```

#### GET /api/stats parametry

| Parametr | Hodnota | Popis |
|---|---|---|
| `device` | `mobile` (výchozí) / `all` | Filtr pro country breakdown |

#### GET /api/admin/logs parametry

| Parametr | Popis |
|---|---|
| `from` | Datum od (YYYY-MM-DD) |
| `to` | Datum do (YYYY-MM-DD) |
| `limit` | Max záznamů (výchozí 50, max 200) |
| `cursor` | Stránkování |

---

## Nasazení

### 1. Vytvořit KV namespaces

V CF dashboardu → Workers & Pages → KV:

```
VISIT_COUNTER
VISIT_LOGS
CAMPAIGNS
```

### 2. Propojit repozitář

Workers & Pages → Create → Pages → Connect to Git → vybrat repozitář.

- Framework preset: **None**
- Build command: *(prázdné)*
- Output directory: `/`

### 3. Nastavit KV bindings

Pages → projekt → Settings → Bindings → přidat tři KV namespaces se správnými názvy.

### 4. Nastavit CF Access pro /admin

Zero Trust → Access → Applications → Add → Self-hosted:

- Domain: `neskenuj.me`, Path: `admin`
- Policy: Include → Emails → tvůj@email.com
- Identity provider: One-time PIN nebo Google

### 5. (Volitelně) Nastavit ADMIN_TOKEN secret

Pages → Settings → Environment Variables → přidat `ADMIN_TOKEN` s náhodnou hodnotou.
Tím získáš záložní autentizaci pro API bez CF Access session.

---

## Kampaně

Každá kampaň má unikátní 8znakový alfanumerický slug (36^8 = ~2,8 bilionu kombinací).

**Vytvořit kampaň:** Admin → sekce Kampaně → Nová kampaň

**URL pro QR kód:** `neskenuj.me/?utm_campaign={slug}`

Po naskenování se zobrazí hlavní edukační stránka s badge nahoře (název kampaně).

**Veřejné výsledky:** `neskenuj.me/kampan/{slug}`

Stránka s grafy, mapou a statistikami — vhodné sdílet zákazníkovi.

---

## Bezpečnost

### Co je chráněno

- **Admin dashboard** — CF Access (Google OAuth nebo One-time PIN)
- **POST /api/campaigns** — vyžaduje CF-Access-Jwt-Assertion nebo X-Admin-Token hlavičku
- **GET /api/campaigns** (seznam) — stejná ochrana jako POST
- **Fingerprint validace** — přijímá pouze hex string 64 znaků (SHA-256 formát)
- **Country validace** — pouze ISO 3166-1 alpha-2 formát
- **Slug validace** — pouze `/^[a-z0-9]{1,64}$/`
- **HTML escaping** — name a description kampaní jsou escapovány při výstupu
- **Raw JSON v logu** — renderován přes `textContent`, ne `innerHTML`

### Co není chráněno (záměrně nebo known limitation)

- **GET /api/campaigns/{slug}** — veřejné (pro /kampan/ stránku)
- **GET /api/stats** — veřejné (pro grafy na hlavní stránce)
- **Rate limiting** — není implementován; doporučeno nastavit CF Rate Limiting pravidlo
- **Bot detekce** — pouze frontend heuristika (WebDriver flag, UA string, hardwareConcurrency)

### CORS

Veřejné endpointy mají `Access-Control-Allow-Origin: *`.
Admin endpointy CORS hlavičku záměrně neposílají.

---

## Stack

- **Hosting:** Cloudflare Pages (serverless)
- **Backend:** Cloudflare Pages Functions (Workers runtime)
- **Databáze:** Cloudflare KV Storage
- **Frontend:** vanilla JS, Bootstrap 5, Chart.js, chartjs-chart-geo
- **Autentizace:** Cloudflare Access (Zero Trust)
- **Geodata:** Cloudflare `request.cf.country` (bez externího API)

---

## Licence

Creative Commons BY 4.0

© 2024–2026 neskenuj.me / scanresponsibly.it | Created by [Buchtič](https://buchtic.net)
