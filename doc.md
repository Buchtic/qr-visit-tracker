# QR Visit Tracker

**Serverless návštěvnostní tracker pro QR kódové kampaně.** Bez cookies, bez Google Analytics, bez externích trackerů. Běží na Cloudflare Pages + KV Storage.

Živé ukázky:
- 🇨🇿 [neskenuj.me](https://neskenuj.me)
- 🇬🇧 [scanresponsibly.it](https://scanresponsibly.it)

---

## Co to dělá

Po naskenování QR kódu stránka:

1. Vytvoří **fingerprint** zařízení z technických parametrů prohlížeče (SHA-256 hash)
2. Zaznamená návštěvu do KV s typem zařízení, OS, zemí, ISP a ASN
3. Zobrazí návštěvníkovi co o sobě prozradil — město, ISP, typ zařízení, fingerprint
4. Detekuje zda jde o vracejícího se návštěvníka (bez cookies, jen přes fingerprint TTL)
5. Zaznamenává statistiky per kampaň pokud přišel přes UTM parametr

---

## Edukační obsah

Stránka obsahuje tyto edukační sekce:

- **Co o sobě prozrazuješ** — fingerprint, User Agent, GPU, síť, geodata z IP
- **Quishing — reálné případy** — 8 zdokumentovaných případů z praxe:
  - Praha 2024: falešné EasyPark samolepky na parkovacích automatech
  - UK 2024/2025: 800 hlášení, £3,5M ukradeno za rok (Action Fraud)
  - Thornaby UK: £13 000 ukradeno na nádraží
  - Texas 2021: 100+ přelepených parkovacích automatů
  - Česko 2021: falešná sbírka po tornádu na jihu Moravy
  - USA: 200 prodejen, $2,3M škoda za 48 hodin
  - Evropa 2024/2025: QR podvody na nabíječkách elektromobilů
  - Restaurace: FBI varování k QR kódům na stolech
- **FAQ** — 9 otázek včetně "Co je quishing?"
- **Jak se bránit** — náhled zkrácených URL, iOS vs Android, VPN

---

## Architektura

```
neskenuj.me/
├── index.html              # Hlavní edukační stránka (CS + EN)
├── script.js               # Frontend logika (fingerprint, detekce, i18n, grafy)
├── charts.js               # Sdílené grafové funkce (Chart.js)
├── styles.css              # Styly (dark/light mode)
├── _headers                # Cloudflare Pages HTTP hlavičky (CSP, security)
├── locales/
│   ├── cs.json             # České texty (UI, FAQ, bannery, fp klíče)
│   └── en.json             # Anglické texty
├── vendor/
│   ├── css/
│   │   ├── bootstrap-icons.min.css
│   │   └── fonts/          # woff, woff2
│   ├── js/
│   │   └── chartjs-chart-geo.min.js
│   └── countries-110m.json # TopoJSON mapa světa
├── admin/
│   └── index.html          # Admin dashboard (chráněno CF Access)
├── kampan/
│   └── index.html          # Reportovací stránka kampaně (/kampan/?id={slug})
└── functions/
    └── api/
        ├── visit.js                    # POST /api/visit
        ├── stats.js                    # GET  /api/stats
        ├── campaigns/
        │   └── [[slug]].js             # GET/POST /api/campaigns[/{slug}]
        └── admin/
            └── logs.js                 # GET  /api/admin/logs
```

---

## Lokalizace (i18n)

Projekt podporuje dvě jazykové mutace:

| Doména | Výchozí jazyk |
|---|---|
| `neskenuj.me` | Čeština |
| `scanresponsibly.it` | Angličtina |

Jazyk se detekuje z hostname. Návštěvník ho může přepnout kliknutím na vlaječku 🇨🇿 / 🇬🇧 v pravém horním rohu — přepnutí se projeví přes URL parametr `?lang=en` nebo `?lang=cs`, bez cookies ani localStorage.

Texty jsou v souborech `locales/cs.json` a `locales/en.json`. Přidání nového jazyka = nový JSON soubor + jedna podmínka v `script.js`.

---

## Cache busting

Lokální soubory (CSS, JS, locales) se verzují přes query parametr řízeným jediným místem v `index.html`:

```html
<meta name="build" content="20260909-01">
```

Po každém deployi změňte tuto hodnotu — invaliduje cache CF Pages pro `styles.css`, `charts.js`, `script.js` i `locales/*.json`.

---

## KV Namespaces

Projekt používá tři KV namespaces:

| Binding | Účel |
|---|---|
| `VISIT_COUNTER` | Agregované čítače (total, dnes, device, OS, country, ASN, boti, QR skeny) |
| `VISIT_LOGS` | Detailní logy návštěv (TTL 90 dní) |
| `CAMPAIGNS` | Metadata a statistiky kampaní |

### Schéma klíčů VISIT_COUNTER

```
total                           → celkový počet unikátních návštěvníků
YYYY-MM-DD                      → návštěvníci za daný den
fp:YYYY-MM-DD:{fingerprint}     → TTL 48h, pro deduplikaci a isReturning detekci
device-{mobile|desktop}-total   → breakdown dle zařízení
device-{mobile|desktop}-YYYY-MM-DD
os-{android|ios|windows|mac|linux}-total
country-{mobile|desktop}-{CC}   → ISO 3166-1 alpha-2
asn-{číslo}                     → počet návštěv per ASN
asn-org-{číslo}                 → název organizace pro dané ASN
bot-total                       → detekované boty + datacenterové přístupy celkem
bot-YYYY-MM-DD
scan-total                      → pravděpodobné QR skeny celkem (mobile + přímý přístup)
scan-YYYY-MM-DD
```

### Schéma klíčů VISIT_LOGS

Každý záznam: `visit:{timestamp}:{fp8znaků}` → JSON s TTL 90 dní

```json
{
  "fingerprint": "hex64",
  "deviceType": "mobile|desktop|unknown",
  "os": "android|ios|windows|mac|linux|unknown",
  "isBot": false,
  "country": "CZ",
  "city": "Prague",
  "region": "Prague",
  "timezone": "Europe/Prague",
  "asn": "5610",
  "asOrg": "O2 Czech Republic",
  "isEU": true,
  "referrer": "https://...",
  "likelyScan": true,
  "utm_campaign": "abc12345",
  "timestamp": 1234567890000
}
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
| `GET` | `/api/campaigns/{slug}` | Statistiky kampaně (pro `/kampan/?id={slug}`) |

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
  "utm_campaign": "slug8znaků",
  "referrer": "https://..."
}
```

Response:
```json
{
  "today": 42,
  "total": 1234,
  "isReturning": false,
  "likelyScan": true,
  "geo": { "country": "CZ", "city": "Prague", "region": "Prague", "asOrg": "O2 Czech Republic", "isEU": true }
}
```

#### GET /api/stats parametry

| Parametr | Hodnota | Popis |
|---|---|---|
| `device` | `mobile` (výchozí) / `all` | Filtr pro country breakdown |

Response obsahuje: `today`, `total`, `stats` (30 dní), `deviceBreakdown`, `osBreakdown`, `countryRanking`, `botBreakdown`, `scanBreakdown`, `asnRanking` (top 20).

#### GET /api/admin/logs parametry

| Parametr | Popis |
|---|---|
| `from` | Datum od (YYYY-MM-DD) |
| `to` | Datum do (YYYY-MM-DD) |
| `limit` | Max záznamů (výchozí 50, max 200) |
| `cursor` | Stránkování |
| `device` | `mobile` / `desktop` |
| `os` | `android` / `ios` / `windows` / `mac` / `linux` |
| `bot` | `0` = bez botů, `1` = jen boti |
| `scan` | `1` = jen pravděpodobné QR skeny |
| `unique` | `1` = deduplikovat per fingerprint |

---

## Logika detekce

### likelyScan — pravděpodobné QR skenování

Návštěva se označí jako pravděpodobné QR skenování pokud:
- `deviceType === "mobile"` AND
- `!isBot` AND
- `referrer` je prázdný (přímý přístup) nebo obsahuje `qr`/`scan`

### Bot detekce (dvouvrstvá)

**Frontend** (v prohlížeči): `navigator.webdriver`, podezřelá slova v UA, nulové HW hodnoty.

**Backend** (server): ASN organizace odpovídá datacenterovému provozovateli (Cloudflare, AWS, Azure, Google, OVH, Hetzner, DigitalOcean, …).

### isReturning — vracející se návštěvník

Kontrola KV klíče `fp:{dnešní datum}:{fingerprint}` s TTL 48 hodin. Pokud existuje = vracející se návštěvník. Bez cookies, bez trackingu mezi dny.

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

CF Access po přihlášení nastaví cookie `CF_Authorization` platnou pro celou doménu. Admin dashboard ji posílá automaticky s každým API requestem přes `credentials: "include"` — není potřeba žádný extra token.

**Volitelně:** Přidat `/api/campaigns` a `/api/admin/logs` jako další chráněné cesty v CF Access aplikaci. CF pak přidává JWT hlavičku i k přímým API requestům (např. z curl).

### 5. (Volitelně) Nastavit ADMIN_TOKEN secret

Pages → Settings → Environment Variables → přidat `ADMIN_TOKEN` s náhodnou hodnotou.
Záložní autentizace pro API bez CF Access session — např. pro lokální testování nebo automatizaci.

---

## Kampaně

Každá kampaň má unikátní 8znakový alfanumerický slug (36^8 ≈ 2,8 bilionu kombinací).

**Vytvořit kampaň:** Admin → sekce Kampaně → Nová kampaň

**URL pro QR kód:** `neskenuj.me/?utm_campaign={slug}`

Po naskenování se zobrazí hlavní edukační stránka s badge nahoře (název kampaně).

**Reportovací stránka:** `neskenuj.me/kampan/?id={slug}` — graf skenování v čase, device split, top země. Vhodné sdílet zákazníkovi jako report výsledků.

**Smazání kampaně:** Admin → tabulka kampaní → 🗑️ → inline potvrzení. Smaže metadata a statistiky kampaně, VISIT_LOGS a celkové čítače se nedotýká.

---

## Bezpečnost

### Co je chráněno

- **Admin dashboard** — CF Access (Google OAuth nebo One-time PIN)
- **POST /api/campaigns** — vyžaduje CF-Access-Jwt-Assertion nebo X-Admin-Token hlavičku
- **GET /api/campaigns** (seznam) — stejná ochrana jako POST
- **Fingerprint validace** — přijímá pouze hex string 64 znaků (`/^[a-f0-9]{64}$/`)
- **Country validace** — pouze ISO 3166-1 alpha-2 (`/^[A-Z]{2}$/`)
- **Slug validace** — pouze `/^[a-z0-9]{1,64}$/`
- **HTML escaping** — name a description kampaní escapovány při výstupu z API
- **XSS ochrana** — fingerprint data renderována přes `textContent`, ne `innerHTML`
- **IP adresa** — záměrně nelogována; ukládají se pouze odvozená data (město, ISP)

### Known limitations

- **Rate limiting** — není implementován; doporučeno nastavit CF Rate Limiting pravidlo na `/api/visit`
- **GET /api/campaigns/{slug}** — veřejné (záměrně, pro `/kampan/` stránku)
- **GET /api/stats** — veřejné (záměrně, pro grafy na hlavní stránce)

### CORS

Veřejné endpointy: `Access-Control-Allow-Origin: *`.
Admin endpointy: CORS hlavičku záměrně neposílají.

---

## Stack

- **Hosting:** Cloudflare Pages (serverless)
- **Backend:** Cloudflare Pages Functions (Workers runtime)
- **Databáze:** Cloudflare KV Storage
- **Frontend:** vanilla JS, Bootstrap 5, Chart.js, chartjs-chart-geo
- **Autentizace:** Cloudflare Access (Zero Trust)
- **Geodata:** Cloudflare `request.cf` (country, city, region, ASN, asOrganization, isEUCountry — bez externího API)
- **i18n:** vlastní JSON-based systém (`locales/cs.json`, `locales/en.json`)

---

## Závislosti a CDN strategie

Projekt používá **hybridní přístup** — hlavní knihovny z Cloudflare CDN, menší/méně běžné lokálně.

### Cloudflare CDN (cdnjs.cloudflare.com)

Stejná infrastruktura jako hosting — žádná závislost na cizí třetí straně:

| Knihovna | Verze | URL |
|---|---|---|
| Bootstrap CSS | 5.3.2 | `cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css` |
| Bootstrap JS | 5.3.2 | `cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js` |
| Chart.js | 4.4.1 | `cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js` |

### Web Awesome Free CDN (ka-f.webawesome.com)

Pouze v `admin/index.html` (WA varianta):

```
ka-f.webawesome.com/webawesome@3.12.0/styles/themes/default.css
ka-f.webawesome.com/webawesome@3.12.0/webawesome.loader.js
```

### Lokální vendor (`/vendor/`)

Knihovny které nejsou na cdnjs nebo mají specifické požadavky:

| Soubor | Popis |
|---|---|
| `vendor/css/bootstrap-icons.min.css` | Bootstrap Icons 1.11.1 |
| `vendor/css/fonts/bootstrap-icons.woff2` | Bootstrap Icons font |
| `vendor/css/fonts/bootstrap-icons.woff` | Bootstrap Icons font (fallback) |
| `vendor/js/chartjs-chart-geo.min.js` | Chart.js geo plugin 4.3.0 |
| `vendor/countries-110m.json` | TopoJSON mapa světa (world-atlas 2.x, 108 KB) |

Vendor soubory mají `Cache-Control: immutable` — prohlížeč je cachuje agresivně bez revalidace.

### Proč tento přístup

- **cdnjs.cloudflare.com** je provozován Cloudflare — stejný provider jako hosting, žádný cizí origin
- Lokální soubory jsou v repozitáři — při aktualizaci stačí nahradit soubor, ne měnit URL v HTML
- Vendor soubory mají `Cache-Control: immutable` (přes `_headers`) — prohlížeč je cachuje agresivně
- Žádné SRI hashe nejsou potřeba pro cdnjs (Cloudflare kontroluje integritu), pro vendor ani

---

## Bezpečnostní hlavičky

Soubor `_headers` v kořeni repozitáře nastavuje HTTP hlavičky přes Cloudflare Pages automaticky při každém deployi:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: (viz níže)
```

CSP povoluje scripty a styly z `'self'` a `cdnjs.cloudflare.com`. Admin část navíc povoluje `ka-f.webawesome.com`. Vendor soubory mají `Cache-Control: immutable`.

Úplný security audit vůči OWASP Top 10 (2021) je v souboru [SECURITY.md](./SECURITY.md).

---

## Licence

Creative Commons BY 4.0

© 2024–2026 neskenuj.me / scanresponsibly.it | Created by [Buchtič](https://buchtic.net)

---

## Záloha a migrace dat

### Export přes admin dashboard

Admin → sekce **Export / Záloha** → tlačítka ke stažení JSON souborů:

| Tlačítko | Endpoint | Obsah |
|---|---|---|
| Vše stáhnout | `/api/admin/export` | CAMPAIGNS + VISIT_COUNTER agregáty |
| Kampaně | `/api/admin/export?ns=campaigns` | Metadata a statistiky kampaní |
| Statistiky | `/api/admin/export?ns=counter` | Agregované čítače (total, device, OS, country, ASN) |
| Logy | `/api/admin/export?ns=logs&limit=500` | Posledních 500 záznamů návštěv |

Soubor se stáhne jako `qr-tracker-backup-{datum}.json`.

**Bezpečnost:** Endpoint nemá CORS hlavičky — není přístupný cross-origin. Chráněno CF Access cookie stejně jako ostatní admin endpointy. Ephemeral klíče (`fp:*`, `stats-cache:*`) jsou ze zálohy vynechány.

**Poznámka:** Workers mají CPU limit 10ms — pro velké datasety (tisíce logů) použijte R2 Cron backup.

---

### Automatická záloha do R2 (doporučeno pro produkci)

Denní snapshot všech KV dat do Cloudflare R2 Object Storage (10 GB zdarma).

#### 1. Vytvořit R2 bucket

```
CF Dashboard → R2 → Create Bucket → název: qr-tracker-backups
```

#### 2. Nasadit backup Worker

Soubor `workers/r2-backup.js` nasadit jako samostatný CF Worker:

```
CF Dashboard → Workers & Pages → Create → Worker
→ Název: qr-tracker-r2-backup
→ Nahrát obsah r2-backup.js
```

#### 3. Nastavit bindings

Worker → Settings → Bindings:
- KV: `VISIT_COUNTER`, `VISIT_LOGS`, `CAMPAIGNS` (stejné jako Pages)
- R2: `BACKUP_BUCKET` → bucket `qr-tracker-backups`
- Environment variable: `ADMIN_TOKEN` → stejná hodnota jako v Pages

#### 4. Nastavit Cron Trigger

```
Worker → Settings → Triggers → Cron Triggers → Add
Schedule: 0 2 * * *   (každý den ve 2:00 UTC)
```

#### Bezpečnost R2 Workeru

- **Cron Trigger** volá `scheduled()` handler — není HTTP přístupný, nevyžaduje auth
- **HTTP handler** (manuální spuštění) vyžaduje `X-Admin-Token`
- Pokud `ADMIN_TOKEN` není nastaven, HTTP handler vrací 503 — Cron funguje dál
- R2 bucket musí být **private** (výchozí nastavení CF) — nikdy nastavovat jako public
- Zálohy v R2 nejsou šifrované — přístup pouze přes CF Dashboard nebo Workers API

#### 5. Struktura záloh v R2

```
backups/
├── 2026-09-10/
│   ├── campaigns.json    ← metadata a statistiky kampaní
│   ├── counter.json      ← agregované čítače
│   ├── logs.json         ← záznamy návštěv za daný den
│   └── manifest.json     ← přehled zálohy (počty klíčů, chyby)
├── 2026-09-11/
│   └── ...
```

#### Manuální spuštění zálohy

```bash
curl -X GET https://qr-tracker-r2-backup.{subdomain}.workers.dev \
  -H "X-Admin-Token: {tvůj-admin-token}"
```

---

### Migrace na D1 (SQLite) — budoucí upgrade

Až projekt poroste (více kampaní, složitější dotazy), zálohy v R2 umožní snadnou migraci na D1:

#### Navrhované schéma D1

```sql
CREATE TABLE campaigns (
    slug        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    start_date  TEXT,
    created_at  TEXT
);

CREATE TABLE campaign_stats (
    slug    TEXT,
    date    TEXT,
    hits    INTEGER DEFAULT 0,
    mobile  INTEGER DEFAULT 0,
    desktop INTEGER DEFAULT 0,
    PRIMARY KEY (slug, date)
);

CREATE TABLE campaign_countries (
    slug    TEXT,
    country TEXT,
    hits    INTEGER DEFAULT 0,
    PRIMARY KEY (slug, country)
);

CREATE TABLE visits (
    id          TEXT PRIMARY KEY,
    fingerprint TEXT,
    device_type TEXT,
    os          TEXT,
    is_bot      INTEGER,
    likely_scan INTEGER,
    country     TEXT,
    city        TEXT,
    as_org      TEXT,
    referrer    TEXT,
    utm_campaign TEXT,
    timestamp   INTEGER
);

CREATE INDEX idx_visits_timestamp ON visits(timestamp);
CREATE INDEX idx_visits_campaign  ON visits(utm_campaign);
```

#### Import z R2 zálohy

```javascript
// Jednorázový import Worker (spustit jednou při migraci)
const backup = await env.BACKUP_BUCKET.get("backups/2026-09-10/campaigns.json");
const { data } = await backup.json();

for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("campaign:") || key.split(":").length !== 2) continue;
    const slug = key.replace("campaign:", "");
    const meta = JSON.parse(value);
    await env.DB.prepare(
        "INSERT OR IGNORE INTO campaigns VALUES (?, ?, ?, ?, ?)"
    ).bind(slug, meta.name, meta.description, meta.startDate, meta.createdAt).run();
}
```

**Kdy migrovat na D1:**
- Více než 20 aktivních kampaní
- Potřeba filtrování logů v SQL (GROUP BY, JOIN)
- KV operace trvale přes 80% denního limitu
- Potřeba real-time analytiky
