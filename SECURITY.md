# Security Audit — OWASP Top 10 (2021)

Projekt: QR Visit Tracker (neskenuj.me / scanresponsibly.it)
Stack: Cloudflare Pages + KV Storage, vanilla JS, serverless Workers
Datum auditu: září 2026

---

## A01 — Broken Access Control ✅

- `POST /api/campaigns` a `GET /api/campaigns` (seznam) vyžadují `CF-Access-Jwt-Assertion` nebo `X-Admin-Token` hlavičku
- Admin dashboard (`/admin/*`) chráněno Cloudflare Access (Zero Trust) — Google OAuth nebo One-time PIN
- `GET /api/campaigns/{slug}` a `GET /api/stats` jsou záměrně veřejné — slouží veřejné části stránky
- `GET /api/admin/logs` vyžaduje auth (CF Access session cookie, `credentials: include`)
- `frame-ancestors 'none'` v CSP zabraňuje clickjacking útokům

**Known limitation:** CF Access JWT není kryptograficky ověřován na backendu — spoléháme na to, že hlavičku `CF-Access-Jwt-Assertion` může nastavit pouze CF Access proxy. V prostředí CF Pages Functions to platí. Pro extra bezpečnost by šlo přidat ověření podpisu JWT vůči CF veřejnému klíči.

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
- Log tabulka: `textContent` místo `innerHTML` pro uživatelská data (geoText, ispText)
- Kampaně tabulka v admin: DOM-based renderování přes `textContent`/`setAttribute`
- Raw JSON v log detailu: `textContent`
- Lokalizační JSON soubory (`locales/`) jsou statické soubory v repozitáři — nelze je vzdáleně pozměnit

**Zbývající `innerHTML` použití:**
Bannery a FAQ těla používají `innerHTML` pro lokalizační texty z `locales/cs.json` a `locales/en.json`. Toto je přijatelné riziko — kompromitace vyžaduje write přístup do repozitáře.

---

## A04 — Insecure Design ✅

- Edukační záměr transparentní — stránka vysvětluje co sbírá a proč
- Privacy by design: IP neukládána, fingerprint jako jednosměrný hash
- Data jsou TTL-bounded: logy 90 dní, fp deduplikace 48h
- Slug kampaně nelze enumerovat (2,8 bilionu kombinací)
- `isReturning` detekce funguje bez cookies — uživatel je informován jak to funguje
- GDPR: bez cookies, bez osobních údajů ve smyslu GDPR
- Open-source kód (GitHub) — úplná transparentnost implementace

---

## A05 — Security Misconfiguration ✅

### HTTP hlavičky (`_headers`)

Soubor `_headers` v kořeni repozitáře — Cloudflare Pages ho načte automaticky při každém deployi.

Všechny stránky:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 1; mode=block
```

### Content Security Policy

**Veřejná stránka `/` a kampaně `/kampan/*`:**
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
- Theme detekce v `<head>` (inline skript před renderem, nelze externalizovat)
- Cache busting skript v `<head>`
- Bootstrap accordion `onclick` atributy

**Doporučení pro budoucnost:** Nahradit `'unsafe-inline'` pomocí `nonce-{random}` generovaného CF Workerem při každém requestu.

### CORS
- Veřejné endpointy: `Access-Control-Allow-Origin: *` (záměrně)
- Admin endpointy: bez CORS hlaviček

---

## A06 — Vulnerable and Outdated Components ✅

### Závislosti a jejich původ

| Knihovna | Verze | Odkud |
|---|---|---|
| Bootstrap | 5.3.2 | cdnjs.cloudflare.com |
| Chart.js | 4.4.1 | cdnjs.cloudflare.com |
| Bootstrap Icons | 1.11.1 | lokálně (`/vendor/css/`) |
| chartjs-chart-geo | 4.3.0 | lokálně (`/vendor/js/`) |
| world-atlas TopoJSON | 2.x | lokálně (`/vendor/countries-110m.json`) |
| Web Awesome Free | 3.12.0 | ka-f.webawesome.com (jen admin) |

**Strategie:**
- `cdnjs.cloudflare.com` — stejná infrastruktura jako hosting, Cloudflare kontroluje integritu
- Lokální vendor — plná kontrola, žádná závislost na třetí straně, v repozitáři
- Žádné npm závislosti v runtime — serverless Workers jsou vanilla JS
- Cloudflare Workers runtime udržuje CF automaticky

---

## A07 — Identification and Authentication Failures ✅

- Admin: Cloudflare Access (Zero Trust) — MFA podporováno, industry standard
- Záložní: `X-Admin-Token` jako silný secret v CF Pages environment variables
- Veřejné API záměrně bez auth — určeno pro anonymní návštěvníky
- `isReturning` detekce přes KV fingerprint TTL — ne pro autentizaci, jen pro UX

---

## A08 — Software and Data Integrity Failures ✅

- Vendor soubory (Bootstrap Icons, chartjs-chart-geo, world-atlas) jsou přímo v repozitáři — plná kontrola integrity
- Lokalizační soubory (`locales/cs.json`, `locales/en.json`) jsou v repozitáři — nelze vzdáleně pozměnit
- Bootstrap a Chart.js z `cdnjs.cloudflare.com` — provozuje Cloudflare, stejná infrastruktura jako hosting
- Web Awesome z `ka-f.webawesome.com` — jejich vlastní CDN, jen v admin

**Known limitation:** cdnjs soubory bez SRI — pokud by byl Cloudflare kompromitován, mohl by servírovat upravený JS. Riziko je přijatelné vzhledem k tomu, že hosting také běží na Cloudflare (stejný threat model).

---

## A09 — Security Logging and Monitoring Failures ⚠️

**Implementováno:**
- Každá návštěva logována do `VISIT_LOGS` KV s TTL 90 dní
- Boti a datacenterové přístupy logováni odděleně (`isBot: true`)
- CF Access loguje přihlášení do adminu (CF Zero Trust dashboard)
- Admin log s filtry (device, OS, bot, scan, unique, datum)
- `likelyScan` flag identifikuje pravděpodobné skutečné QR skeny

**Chybí — rate limiting (priorita 1):**

Nastavit v CF dashboardu:
```
Workers & Pages → neskenuj.me → Settings → Security → Rate Limiting Rules
→ Název:   Protect /api/visit
→ Pole:    URI Path
→ Operátor: equals
→ Hodnota: /api/visit
→ Limit:   20 požadavků / 60 sekund / per IP
→ Akce:    Block
```

Bez rate limitingu lze POST /api/visit volat bez omezení a zatížit KV Storage nebo znehodnotit statistiky.

---

## A10 — Server-Side Request Forgery ✅

- Backend neprovádí žádné HTTP požadavky na základě uživatelského vstupu
- Geodata z `request.cf.*` — Cloudflare interní, důvěryhodné
- Žádné webhooky, URL fetchování ani DNS lookups iniciované uživatelskými daty

---

## Přehled

| # | Kategorie | Status | Poznámka |
|---|---|---|---|
| A01 | Broken Access Control | ✅ | CF Access + admin token + CSP frame-ancestors |
| A02 | Cryptographic Failures | ✅ | SHA-256, no IP, crypto.getRandomValues |
| A03 | Injection | ✅ | Validace, escaping, DOM-based rendering |
| A04 | Insecure Design | ✅ | Privacy by design, TTL, open-source transparentnost |
| A05 | Security Misconfiguration | ✅ | _headers, CSP, X-Frame-Options, Permissions-Policy |
| A06 | Vulnerable Components | ✅ | cdnjs (CF infrastruktura) + vendor lokálně |
| A07 | Auth Failures | ✅ | CF Access Zero Trust + ADMIN_TOKEN |
| A08 | Data Integrity | ✅ | Vendor v repo, locales v repo, cdnjs = CF |
| A09 | Logging & Monitoring | ⚠️ | Chybí CF WAF rate limiting na /api/visit |
| A10 | SSRF | ✅ | Neaplikovatelné |

### Zbývající akce

1. **Rate limiting** (priorita 1, ~5 minut) — CF Dashboard → WAF → Rate Limiting Rules → POST /api/visit max 20/min per IP. Viz sekce A09 výše.
2. **CSP nonce** (nízká priorita) — odstranit `'unsafe-inline'` pomocí CF Worker nonce. Složitější, přínos omezený.
3. **JWT ověření** (nízká priorita) — kryptograficky ověřit CF Access JWT na backendu.

---

*Audit: září 2026 | OWASP Top 10 (2021)*
