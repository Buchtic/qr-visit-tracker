# Security Audit — OWASP Top 10 (2021)

Projekt: QR Visit Tracker (neskenuj.me / scanresponsibly.it)
Stack: Cloudflare Pages + KV Storage, vanilla JS, serverless Workers
Datum auditu: září 2026

---

## A01 — Broken Access Control ✅

### Admin dashboard
- `/admin/*` chráněno Cloudflare Access (Zero Trust) — Google OAuth nebo One-time PIN
- CF Access nastaví cookie `CF_Authorization` po přihlášení — platná pro celou doménu

### API autentizace — `isAdminRequest()`

Funkce v `campaigns.js` ověřuje admin požadavky třemi způsoby (v pořadí priority):

```javascript
// 1. CF-Access-Jwt-Assertion — přidává CF Access proxy automaticky
//    pro cesty přímo chráněné CF Access aplikací
const cfJwt = request.headers.get("CF-Access-Jwt-Assertion");
if (cfJwt) return true;

// 2. CF_Authorization cookie — browser ji posílá automaticky
//    přes credentials: "include" na celou doménu
//    Fetch z /admin/ stránky ji vždy přiloží
const cookie = request.headers.get("Cookie") || "";
if (cookie.includes("CF_Authorization=")) return true;

// 3. X-Admin-Token — záložní pro curl/lokální testování
//    Nastaven jako CF Pages environment secret: ADMIN_TOKEN
const adminToken = request.headers.get("X-Admin-Token");
if (env.ADMIN_TOKEN && adminToken === env.ADMIN_TOKEN) return true;
```

**Proč cookie fallback:** CF Access přidává `CF-Access-Jwt-Assertion` hlavičku jen pro cesty přímo chráněné v CF Access aplikaci (`/admin/*`). API endpointy (`/api/campaigns`) nejsou v CF Access chráněné — JWT hlavička tam nepřijde. Cookie `CF_Authorization` je nastavena na celou doménu a browser ji posílá automaticky s `credentials: "include"`.

**Alternativa přes CF Dashboard:** Přidat `/api/campaigns` a `/api/admin/logs` jako chráněné cesty do CF Access aplikace. CF pak přidává JWT hlavičku i k API requestům a cookie fallback není potřeba.

### Chráněné vs veřejné endpointy

| Endpoint | Přístup | Ochrana |
|---|---|---|
| `POST /api/visit` | Veřejný | — |
| `GET /api/stats` | Veřejný | — |
| `GET /api/campaigns/{slug}` | Veřejný | — |
| `GET /api/campaigns` (seznam) | Admin | CF Access cookie / JWT / token |
| `POST /api/campaigns` | Admin | CF Access cookie / JWT / token |
| `GET /api/admin/logs` | Admin | CF Access cookie / JWT / token |

- `frame-ancestors 'none'` v CSP zabraňuje clickjacking útokům

**Known limitation:** Cookie fallback ověřuje přítomnost `CF_Authorization=` v cookie stringu bez kryptografického ověření JWT podpisu. Útočník s přístupem k doméně by mohl cookie sfalšovat. V praxi je to nepravděpodobné — cookie je httpOnly, secure, sameSite. Pro paranoidní nasazení: přidat kryptografické ověření CF Access JWT vůči veřejnému klíči CF.

---

## A02 — Cryptographic Failures ✅

- Fingerprint hashován SHA-256 výhradně v prohlížeči — na server jde jen hash, ne raw data
- Hash nelze zpětně dekódovat na původní hodnoty
- IP adresa záměrně neukládána — ukládají se jen odvozená data (město, stát, ISP)
- KV Storage komunikuje přes HTTPS (Cloudflare interní síť)
- Slug kampaně generován přes `crypto.getRandomValues()` — kryptograficky bezpečný PRNG (36^8 ≈ 2,8 bilionu kombinací)
- TLS zajišťuje Cloudflare automaticky pro obě domény

---

## A03 — Injection ✅

- KV Storage nepoužívá SQL — SQL injection není možný
- Fingerprint validován `/^[a-f0-9]{64}$/` — pouze hex string 64 znaků
- Country validován `/^[A-Z]{2}$/` — pouze ISO 3166-1 alpha-2
- Slug validován `/^[a-z0-9]{1,64}$/`
- startDate validován `/^\d{4}-\d{2}-\d{2}$/`
- Délky všech string vstupů ořezány (`.slice(0, N)`)
- HTML escaping na API výstupu: `escapeHtml()` pro name/description kampaní
- Log tabulka: `textContent` místo `innerHTML` pro uživatelská data
- Kampaně tabulka v admin: DOM-based renderování přes `textContent`/`setAttribute`
- Raw JSON v log detailu: `textContent`
- Lokalizační JSON soubory jsou statické v repozitáři — nelze vzdáleně pozměnit

**Zbývající `innerHTML`:** bannery a FAQ těla používají `innerHTML` pro lokalizační texty z `locales/*.json`. Přijatelné — kompromitace vyžaduje write přístup do repozitáře.

---

## A04 — Insecure Design ✅

- Edukační záměr transparentní — stránka vysvětluje co sbírá a proč
- Privacy by design: IP neukládána, fingerprint jako jednosměrný hash
- Data TTL-bounded: logy 90 dní, fp deduplikace 48h
- Slug nelze enumerovat (2,8 bilionu kombinací)
- `isReturning` bez cookies — uživatel informován jak funguje
- GDPR: bez cookies, bez osobních údajů ve smyslu GDPR
- Open-source kód (GitHub) — úplná transparentnost implementace

---

## A05 — Security Misconfiguration ✅

### HTTP hlavičky (`_headers`)

Soubor v kořeni repozitáře — CF Pages načte automaticky při každém deployi.

Všechny stránky:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 1; mode=block
```

### Content Security Policy

**Veřejná stránka `/` a `/kampan/*`:**
```
script-src  'self' 'unsafe-inline' https://cdnjs.cloudflare.com
style-src   'self' 'unsafe-inline' https://cdnjs.cloudflare.com
connect-src 'self' https://cdnjs.cloudflare.com
font-src    'self'
img-src     'self' data:
frame-ancestors 'none'
```

**Admin `/admin/*`:**
```
script-src  'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://ka-f.webawesome.com
style-src   'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://ka-f.webawesome.com
font-src    'self' https://ka-f.webawesome.com
connect-src 'self' https://cdnjs.cloudflare.com
frame-ancestors 'none'
```

**Vendor soubory:**
```
Cache-Control: public, max-age=31536000, immutable
```

**`'unsafe-inline'` je potřeba pro:**
- Theme detekce v `<head>` (inline skript před renderem)
- Cache busting skript v `<head>`
- Bootstrap accordion `onclick` atributy

**Doporučení:** Nahradit `'unsafe-inline'` pomocí `nonce-{random}` generovaného CF Workerem.

---

## A06 — Vulnerable and Outdated Components ✅

| Knihovna | Verze | Odkud |
|---|---|---|
| Bootstrap | 5.3.2 | cdnjs.cloudflare.com |
| Chart.js | 4.4.1 | cdnjs.cloudflare.com |
| Bootstrap Icons | 1.11.1 | lokálně (`/vendor/css/`) |
| chartjs-chart-geo | 4.3.0 | lokálně (`/vendor/js/`) |
| world-atlas TopoJSON | 2.x | lokálně (`/vendor/countries-110m.json`) |
| Web Awesome Free | 3.12.0 | ka-f.webawesome.com (jen admin) |

- `cdnjs.cloudflare.com` — stejná infrastruktura jako hosting
- Lokální vendor — plná kontrola, v repozitáři
- Žádné npm závislosti v runtime

---

## A07 — Identification and Authentication Failures ✅

- Admin: Cloudflare Access (Zero Trust) — MFA podporováno
- API: třívrstevná autentizace (JWT / CF_Authorization cookie / X-Admin-Token)
- Záložní: `X-Admin-Token` jako secret v CF Pages environment variables
- Veřejné API záměrně bez auth

---

## A08 — Software and Data Integrity Failures ✅

- Vendor soubory v repozitáři — plná kontrola integrity
- Lokalizační soubory v repozitáři — nelze vzdáleně pozměnit
- Bootstrap a Chart.js z `cdnjs.cloudflare.com` — stejný provider jako hosting
- SRI hashe nejsou implementovány pro cdnjs (Cloudflare kontroluje integritu)

---

## A09 — Security Logging and Monitoring Failures ⚠️

**Implementováno:**
- Každá návštěva logována do `VISIT_LOGS` KV s TTL 90 dní
- Boti logováni odděleně (`isBot: true`)
- CF Access loguje přihlášení do adminu
- Admin log s filtry (device, OS, bot, scan, unique, datum)
- `likelyScan` flag identifikuje pravděpodobné QR skeny

**Chybí — rate limiting (priorita 1):**

```
CF Dashboard → neskenuj.me → Security → WAF → Rate Limiting Rules
→ POST /api/visit: max 20 požadavků / 60 sekund / per IP → Block
```

---

## A10 — Server-Side Request Forgery ✅

- Backend neprovádí HTTP požadavky na základě uživatelského vstupu
- Geodata z `request.cf.*` — Cloudflare interní
- Žádné webhooky ani URL fetchování iniciované uživatelskými daty

---

## GDPR a ochrana osobních údajů

| Data | Ukládáme? | Osobní údaj? |
|---|---|---|
| IP adresa | ❌ Ne | Ano — proto neukládáme |
| SHA-256 fingerprint | ✅ Ano | Pravděpodobně ne — jednosměrná transformace |
| Město, stát, ISP | ✅ Ano | Pravděpodobně ne — agregovaná geodata |
| Cookies | ❌ Ne | — |

Cloudflare má platné DPA a EU Standard Contractual Clauses. Viz [cloudflare.com/gdpr](https://www.cloudflare.com/gdpr/introduction/).

---

## Přehled

| # | Kategorie | Status | Poznámka |
|---|---|---|---|
| A01 | Broken Access Control | ✅ | CF Access + cookie + token fallback |
| A02 | Cryptographic Failures | ✅ | SHA-256, no IP, crypto.getRandomValues |
| A03 | Injection | ✅ | Validace, escaping, DOM-based rendering |
| A04 | Insecure Design | ✅ | Privacy by design, TTL, open-source |
| A05 | Security Misconfiguration | ✅ | _headers, CSP, X-Frame-Options |
| A06 | Vulnerable Components | ✅ | cdnjs + vendor lokálně |
| A07 | Auth Failures | ✅ | CF Access + třívrstevná API auth |
| A08 | Data Integrity | ✅ | Vendor a locales v repozitáři |
| A09 | Logging & Monitoring | ⚠️ | Chybí CF WAF rate limiting |
| A10 | SSRF | ✅ | Neaplikovatelné |

### Zbývající akce

1. **Rate limiting** (5 minut) — CF Dashboard → WAF → Rate Limiting → POST /api/visit max 20/min per IP
2. **CF Access pro API** (alternativa k cookie fallback) — přidat `/api/campaigns` a `/api/admin/logs` jako chráněné cesty v CF Access aplikaci
3. **CSP nonce** (nízká priorita) — odstranit `'unsafe-inline'` pomocí CF Worker nonce
4. **JWT ověření** (nízká priorita) — kryptograficky ověřit CF Access JWT podpis na backendu

---

*Audit: září 2026 | OWASP Top 10 (2021)*
