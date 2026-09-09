// ---------------------------
// Dark mode toggle
// ---------------------------
document.getElementById("themeToggle").addEventListener("click", () => {
    const body = document.body;
    const isDark = body.classList.contains("dark");

    body.classList.toggle("dark", !isDark);
    body.classList.toggle("light", isDark);

    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    document.getElementById("themeToggle").textContent =
        isDark ? "◑" : "☼";
});

// ---------------------------
// i18n — načtení lokalizace
// ---------------------------

// Výchozí jazyk: scanresponsibly.it = en, jinak cs
// Přepínač přidá ?lang= do URL — žádné storage
const HOSTNAME_LANG = location.hostname.includes("scanresponsibly.it") ? "en" : "cs";
const LANG = new URLSearchParams(location.search).get("lang") || HOSTNAME_LANG;
let _t = {};

async function loadLocale() {
    try {
        const build = document.head.querySelector('meta[name="build"]')?.content || '1';
        const res = await fetch(`/locales/${LANG}.json?v=${build}`);
        _t = await res.json();
    } catch (e) {
        console.warn("i18n: nepodařilo se načíst lokalizaci", e);
        _t = {};
    }
    applyTexts();
}

function t(key) { return _t[key] ?? key; }
function tFp(key) { return t("fp." + key); }

function toggleLang() {
    const next = LANG === "cs" ? "en" : "cs";
    const params = new URLSearchParams(location.search);
    params.set("lang", next);
    location.search = params.toString();
}

function applyTexts() {
    const set = (id, val, html = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (html) el.innerHTML = val; else el.textContent = val;
    };

    set("title",             t("title"));
    set("todayLabel",        t("todayLabel"));
    set("totalLabel",        t("totalLabel"));
    set("revealTitle",       t("revealTitle"));
    set("revealText1",       t("revealText1"));
    set("revealText2",       t("revealText2"));
    set("whyTitle",          t("whyTitle"));
    set("chartTitle",        t("chartTitle"));
    set("heatmapTitle",      t("heatmapTitle"));
    set("nocookiesTitle",    t("nocookiesTitle"));
    set("nocookiesText1",    t("nocookiesText1"));
    set("nocookiesText2",    t("nocookiesText2"));
    set("motivationTitle",   t("motivationTitle"));
    set("motivationText",    t("motivationText"));
    set("contactTitle",      t("contactTitle"));
    set("contactText",       t("contactText"));
    set("trainingTitle",     t("trainingTitle"));
    set("trainingText",      t("trainingText"), true);
    set("deviceChartTitle",  t("deviceChartTitle"));
    set("osChartTitle",      t("osChartTitle"));
    set("ispTitle",          t("ispTitle"));
    set("faqTitle",          t("faqTitle"));
    set("totalMobileLabel",  t("totalMobileLabel"));
    set("totalDesktopLabel", t("totalDesktopLabel"));

    const whyEl = document.getElementById("whyList");
    if (whyEl && Array.isArray(_t.whyList)) {
        whyEl.innerHTML = _t.whyList.map(item => `<li>${item}</li>`).join("");
    }

    document.documentElement.lang = LANG;
    document.title = t("title");

    // FAQ otázky — jen nadpisy tlačítek (odpovědi zůstávají v HTML)
    const faqKeys = ["faq.q1","faq.q2","faq.q3","faq.q4","faq.q5","faq.q6","faq.q7","faq.q8"];
    document.querySelectorAll("#faqAccordion .accordion-button").forEach((btn, i) => {
        if (faqKeys[i] && t(faqKeys[i]) !== faqKeys[i]) btn.textContent = t(faqKeys[i]);
    });

    // Vlaječka v topbaru — kliknutím přepne jazyk
    const flagEl = document.getElementById("langFlag");
    if (flagEl) {
        flagEl.textContent = t("lang.flag");
        // Tooltip: zobrazit druhý jazyk jako nápovědu
        const otherLang = LANG === "cs" ? "🇬🇧 English" : "🇨🇿 Čeština";
        flagEl.title = otherLang;
        flagEl.style.cursor = "pointer";
        flagEl.onclick = toggleLang;
    }
}

// ---------------------------
// Fingerprint
// ---------------------------
async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function detectDeviceType() {
    // 1) Moderní API
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
        return navigator.userAgentData.mobile ? "mobile" : "desktop";
    }

    // 2) User agent fallback
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|android|mobile/.test(ua)) {
        return "mobile";
    }

    // 3) Touch fallback
    if (navigator.maxTouchPoints > 1) {
        return "mobile";
    }

    return "desktop";
}

function detectOS() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    if (/windows/i.test(ua)) return "windows";
    if (/macintosh|mac os x/i.test(ua)) return "mac";
    if (/linux/i.test(ua)) return "linux";
    return "unknown";
}

function detectBot() {
    // 1) WebDriver (Selenium, Puppeteer atd.)
    if (navigator.webdriver === true) return true;

    // 2) Podezřelý User Agent
    const ua = navigator.userAgent.toLowerCase();
    if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i.test(ua)) return true;

    // 3) Nulové hardwarové hodnoty (typické pro headless)
    if (navigator.hardwareConcurrency === 0) return true;
    if (navigator.deviceMemory === 0) return true;

    // 4) Chybějící plugins kolekce (headless Chrome ji nemá)
    if (navigator.plugins && navigator.plugins.length === 0 && !navigator.userAgentData?.mobile) {
        // Na desktopu bez pluginů + bez dotykového vstupu = podezřelé
        if (navigator.maxTouchPoints === 0) return true;
    }

    return false;
}


/*
async function getFingerprintData() {
    const data = {
        "User Agent": navigator.userAgent,
        "Jazyk": navigator.language,
        "Rozlišení obrazovky": `${screen.width}×${screen.height}`,
        "Barevná hloubka": screen.colorDepth,
        "Časová zóna": Intl.DateTimeFormat().resolvedOptions().timeZone,
		"Cookies Enabled": navigator.cookieEnabled,
        "JavaScript Enabled": true,
        "Podpora dotyku": 'ontouchstart' in window,
		"Počet dotykových bodů": navigator.maxTouchPoints,
		"Počet CPU vláken": navigator.hardwareConcurrency,
        "Velikost RAM (GB)": navigator.deviceMemory || "Unknown",
        "Platforma": navigator.platform,
		"Vendor": navigator.vendor,
        "PDF Viewer Enabled": navigator.pdfViewerEnabled,
        "WebDriver (Automation)": navigator.webdriver || false,
		
		
        "Preference tmavého režimu": window.matchMedia("(prefers-color-scheme: dark)").matches,
        "Do Not Track": navigator.doNotTrack,		
		
        "Podpora WebGL": (() => {
            try {
                const canvas = document.createElement("canvas");
                return !!canvas.getContext("webgl");
            } catch {
                return false;
            }
        })()
    };

    const hashInput = Object.values(data).join("|");
    data["Fingerprint"] = await sha256(hashInput);

    return data;
}*/

function getGPUInfo() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return { "Podpora WebGL": false };

        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

        return {
            "Podpora WebGL": true,
            "GPU Vendor": debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown",
            "GPU Renderer": debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown",
            "WebGL Version": gl.getParameter(gl.VERSION),
            "Shading Language": gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            "Max Texture Size": gl.getParameter(gl.MAX_TEXTURE_SIZE),
            "Max Cube Map Size": gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
            "Max Renderbuffer Size": gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
        };
    } catch (e) {
        return { "WebGL Supported": false };
    }
}

async function getFingerprintData() {
    const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
	const gpu = getGPUInfo();
	const deviceType = detectDeviceType();
    const data = {
        general: {
            "User Agent": navigator.userAgent,
            "Language": navigator.language,
            "Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
            "Referrer": document.referrer || "None",
            "Cookies Enabled": navigator.cookieEnabled,
            "Do Not Track": navigator.doNotTrack, 
            "JavaScript povolen": true
        },
        device: {
            "Device Type": deviceType,
			"Platform": navigator.platform,
            "Vendor": navigator.vendor,
            "CPU Threads": navigator.hardwareConcurrency || "Unknown",
            "Device Memory (GB)": navigator.deviceMemory || "Unknown",
			"Podpora dotyku": 'ontouchstart' in window,
            "Max Touch Points": navigator.maxTouchPoints || 0,
            "Prefers Dark Mode": window.matchMedia("(prefers-color-scheme: dark)").matches,
            "PDF prohlížeč povolen": navigator.pdfViewerEnabled,
            "WebDriver (Automation)": navigator.webdriver || false,
            "Virtual Keyboard API": !!navigator.virtualKeyboard,
			"Keyboard API": !!navigator.keyboard,
			"Keyboard Lock Supported": !!navigator.keyboard?.lock			
        },
		gpu: gpu,
        display: {
            "Screen Resolution": `${screen.width}×${screen.height}`,
			"Pixel Ratio": window.devicePixelRatio,
			"Orientation": screen.orientation?.type || "Unknown",
			"Color Depth": screen.colorDepth

        },
        network: {
            "Network Type": connection ? connection.effectiveType : "Unknown",            
            "Downlink (Mb/s)": connection ? connection.downlink : "Unknown",
			"RTT (ms)": connection?.rtt || "Unknown",
            "Save Data Mode": connection ? connection.saveData : "Unknown"
        }
    };

    // vytvoření fingerprintu
    const hashInput = Object.values(data.general)
        .concat(Object.values(data.device))
		.concat(Object.values(data.gpu))
        .concat(Object.values(data.display))
        .concat(Object.values(data.network))
        .join("|");

    data.fingerprint = await sha256(hashInput);

    return data;
}

function translateKey(key) {
    // Překlad klíče fingerprintu přes i18n JSON
    const translated = tFp(key);
    if (translated !== key) return translated;
    const map = {
        "User Agent": "User Agent",
        "Language": "Jazyk",
        "Timezone": "Časová zóna",
        "Referrer": "Odkud jste přišli",
        "Cookies Enabled": "Cookies povoleny",
        "Do Not Track": "Do Not Track",
        "PDF Viewer Enabled": "PDF prohlížeč povolen",
        "Permissions API Available": "Permissions API dostupné",

        "Device Type": "Typ zařízení",
        "Platform": "Platforma",
        "Vendor": "Výrobce jádra prohlížeče",
        "CPU Threads": "Počet vláken CPU",
        "Device Memory (GB)": "Velikost RAM (GB)",
        "Max Touch Points": "Počet dotykových bodů",
        "Prefers Dark Mode": "Preference tmavého režimu",
        "WebDriver (Automation)": "WebDriver (automatizace)",
        "User Activation (Active)": "Uživatelská aktivace (aktivní)",
        "User Activation (Ever)": "Uživatelská aktivace (někdy)",
        "Virtual Keyboard API": "API virtuální klávesnice",
        "Keyboard API": "API klávesnice",
        "Keyboard Lock Supported": "Podpora zamčení klávesnice",

        "GPU Vendor": "Výrobce GPU",
        "GPU Renderer": "Model GPU",
        "WebGL Version": "WebGL verze",
        "Shading Language": "Shading jazyk",
        "Max Texture Size": "Maximální velikost textury",
        "Max Cube Map Size": "Maximální velikost cube mapy",
        "Max Renderbuffer Size": "Maximální velikost render bufferu",

        "Screen Resolution": "Rozlišení obrazovky",
        "Available Resolution": "Dostupné rozlišení",
        "Pixel Ratio": "Hustota pixelů",
        "Orientation": "Orientace",
        "Color Depth": "Barevná hloubka",

        "Network Type": "Typ připojení",
        "Downlink (Mb/s)": "Rychlost stahování (Mb/s)",
        "RTT (ms)": "Latence (ms)",
        "Save Data Mode": "Režim šetření dat",
        "Město": "Město",
        "Region": "Region",
        "Poskytovatel (ISP)": "Poskytovatel (ISP)",
        "EU návštěvník": "EU návštěvník"
    };

    return map[key] || key; // fallback = anglický klíč
}


// ---------------------------
// API calls
// ---------------------------
async function sendVisit(fingerprint, deviceType, os, isBot, utmCampaign) {
    const referrer = document.referrer || "";
    const res = await fetch("api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fingerprint, deviceType, os, isBot,
            utm_campaign: utmCampaign || null,
            referrer
        })
    });
    return await res.json();
}

async function loadStats() {
    const res = await fetch("api/stats");
    return await res.json();
}


// ---------------------------
// Desktop / Bot banner
// ---------------------------
function showDesktopBanner() {
    const banner = document.createElement("div");
    banner.id = "desktopBanner";
    banner.style.cssText = `
        background: linear-gradient(135deg, #1c2a3a, #1a2332);
        border: 1px solid #30363d;
        border-left: 4px solid #58a6ff;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    `;
    banner.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">🖥️</span>
        <div>
            <strong style="color:#58a6ff;">${t("bannerDesktop.title")}</strong>
            <p style="margin:4px 0 0;color:#8b949e;font-size:0.9rem;">${t("bannerDesktop.text")}</p>
        </div>
    `;
    const container = document.querySelector(".container");
    const title = document.getElementById("title");
    container.insertBefore(banner, title.nextSibling);
}

function showBotBanner() {
    const banner = document.createElement("div");
    banner.id = "botBanner";
    banner.style.cssText = `
        background: linear-gradient(135deg, #2a1c1c, #231a1a);
        border: 1px solid #30363d;
        border-left: 4px solid #f85149;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    `;
    banner.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">🤖</span>
        <div>
            <strong style="color:#f85149;">${t("bannerBot.title")}</strong>
            <p style="margin:4px 0 0;color:#8b949e;font-size:0.9rem;">${t("bannerBot.text")}</p>
        </div>
    `;
    const container = document.querySelector(".container");
    const title = document.getElementById("title");
    container.insertBefore(banner, title.nextSibling);
}

function showReturningBanner() {
    const banner = document.createElement("div");
    banner.id = "returningBanner";
    banner.style.cssText = `
        background: linear-gradient(135deg, #1a2a1c, #1a231a);
        border: 1px solid #30363d;
        border-left: 4px solid #3fb950;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    `;
    banner.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">👋</span>
        <div>
            <strong style="color:#3fb950;">${t("bannerReturning.title")}</strong>
            <p style="margin:4px 0 0;color:#8b949e;font-size:0.9rem;">${t("bannerReturning.text")}</p>
        </div>
    `;
    const container = document.querySelector(".container");
    const title = document.getElementById("title");
    container.insertBefore(banner, title.nextSibling);
}

// Grafy a geo funkce jsou v charts.js

// ---------------------------
// Spinner helpers
// ---------------------------
function hideSpinner(spinnerId) {
    const el = document.getElementById(spinnerId);
    if (el) el.style.display = "none";
}

function showChart(spinnerId, canvasId) {
    hideSpinner(spinnerId);
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas.style.display = "";
}

// ---------------------------
// Campaign badge
// ---------------------------
async function loadCampaignBadge(slug) {
    try {
        const res = await fetch(`api/campaigns/${slug}`);
        if (!res.ok) return; // neexistující slug — nic nezobrazíme

        const data = await res.json();
        if (!data.name) return;

        const badge = document.getElementById("campaignBadge");
        const nameEl = document.getElementById("campaignBadgeName");
        const descEl = document.getElementById("campaignBadgeDesc");

        nameEl.textContent = data.name;

        if (data.description) {
            descEl.textContent = data.description;
            descEl.style.display = "";
        }

        badge.style.display = "";
    } catch {
        // Tiché selhání — badge prostě nezobrazíme
    }
}


/*
function renderFingerprint(data) {
    fillSection("fp-general", data.general);
    fillSection("fp-device", data.device);
    fillSection("fp-display", data.display);
    fillSection("fp-network", data.network);

    document.getElementById("fp-hash").textContent = data.fingerprint;
}

function fillSection(id, obj) {
    const box = document.getElementById(id);
    for (const [k, v] of Object.entries(obj)) {
        const div = document.createElement("ul");
        div.className = "mb-0";
        div.innerHTML = `<strong>${k}:</strong> ${v}`;
        box.appendChild(div);
    }
}*/

function renderFingerprint(data) {
    fillSection("fp-general", data.general);
    fillSection("fp-device", data.device);
    fillSection("fp-gpu", data.gpu || { "Podpora WebGL": false });
    fillSection("fp-display", data.display);
    fillSection("fp-network", data.network);

    document.getElementById("fp-hash").textContent = data.fingerprint;
}

/*function fillSection(id, obj) {
    const box = document.getElementById(id);
    box.innerHTML = "";

    for (const [k, v] of Object.entries(obj)) {
        const row = document.createElement("li");
        row.className = "mb-0";
        row.innerHTML = `<strong>${k}:</strong> ${v}`;
        box.appendChild(row);
    }
}*/

function fillSection(id, obj) {
    const box = document.getElementById(id);
    if (!box) return;

    box.innerHTML = "";

    for (const [key, value] of Object.entries(obj || {})) {
        const li = document.createElement("li");

        const badgeType = getBadgeType(key);
        const tooltip = getTooltip(key).replace(/"/g, "'");
        // UA a podobné dlouhé hodnoty dostanou font-size menší a povolíme zalamování
        const isLong = String(value).length > 60;
        const extraStyle = isLong
            ? "white-space:normal;word-break:break-word;font-size:0.72rem;font-weight:400;text-align:left;"
            : "";

        const strong = document.createElement("strong");
        strong.textContent = translateKey(key) + ":";

        const span = document.createElement("span");
        span.className = `badge bg-${badgeType}`;
        span.style.cssText = `display:inline-block;${extraStyle}`;
        if (window.bootstrap) {
            span.setAttribute("data-bs-toggle", "tooltip");
            span.setAttribute("title", tooltip);
        }
        span.textContent = value; // textContent zabraňuje XSS

        li.appendChild(strong);
        li.appendChild(document.createTextNode(" "));
        li.appendChild(span);

        box.appendChild(li);
    }

    // aktivace tooltipů jen pokud je Bootstrap JS k dispozici
    if (window.bootstrap && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(
            box.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }
}




function getBadgeType(key) {
    const danger = ["WebDriver", "User Activation", "Virtual Keyboard", "Keyboard"];
    const warning = ["Pixel Ratio", "GPU Renderer", "GPU Vendor"];
    const info = ["CPU", "Memory", "Threads", "WebGL", "Shading", "Texture"];
    
    /*if (danger.some(k => key.includes(k))) return "danger";
    if (warning.some(k => key.includes(k))) return "warning";
    if (info.some(k => key.includes(k))) return "info";*/
    return "secondary";
}

function getTooltip(key) {
    const tooltips = {
        "User Agent": "Řetězec, který identifikuje váš prohlížeč a systém.",
        "Language": "Preferovaný jazyk vašeho prohlížeče.",
        "Timezone": "Časová zóna získaná z vašeho systému.",
        "Referrer": "Stránka, ze které jste přišli (pokud existuje).",
        "Cookies Enabled": "Zda má prohlížeč povolené cookies.",
        "Do Not Track": "Nastavení ochrany soukromí v prohlížeči.",
        "Device Type": "Klasifikace hardware na základě dostupných informací (odhad).",
        "Platform": "Operační systém nebo jeho varianta (v případě Windows se vždy zobrazí Win32, i když používáte 64-bitový systém).",
        "Vendor": "Výrobce prohlížeče.",
        "CPU Threads": "Počet vláken procesoru dostupných pro prohlížeč.",
        "Device Memory": "Odhad dostupné RAM.",
        "Max Touch Points": "Kolik dotykových bodů zařízení podporuje.",
        "Prefers Dark Mode": "Preferované barevné schéma systému.",
        "WebDriver": "Zda běžíte v automatizovaném prostředí (bot detection).",
        "User Activation": "Zda jste provedli interakci se stránkou.",
        "Virtual Keyboard": "Podpora virtuální klávesnice (mobilní zařízení).",
        "Screen Resolution": "Fyzické rozlišení vašeho displeje.",
        "Available Resolution": "Rozlišení bez systémových lišt.",
        "Pixel Ratio": "Hustota pixelů (Retina displeje mají hodnotu 2).",
        "Orientation": "Aktuální orientace displeje.",
        "Color Depth": "Počet bitů na pixel.",
        "Network Type": "Odhad typu připojení (4g, wifi…).",
        "Downlink": "Odhadovaná rychlost stahování.",
        "RTT": "Odhadovaná latence.",
        "Save Data Mode": "Zda má zařízení zapnutý úsporný režim dat.",
        "GPU Vendor": "Výrobce grafického čipu.",
        "GPU Renderer": "Konkrétní model grafické karty.",
        "WebGL Version": "Verze WebGL dostupná v prohlížeči.",
        "Shading Language": "Verze shading jazyka pro WebGL.",
        "Max Texture Size": "Maximální velikost textury, kterou GPU zvládne.",
        "Max Cube Map Size": "Maximální velikost cube mapy.",
        "Max Renderbuffer Size": "Maximální velikost render bufferu."
    };

    return tooltips[key] || "Technická informace získaná z vašeho prohlížeče.";
}




// ---------------------------
// Init
// ---------------------------
/*async function init() {
    await loadLocale();

    const data = await getFingerprintData();

    // vypis fingerprint dat
    const box = document.getElementById("fpdata");
    for (const [k, v] of Object.entries(data)) {
        const div = document.createElement("li");
        div.className = "mb-0";
        div.innerHTML = `<strong>${k}:</strong> ${v}`;
        box.appendChild(div);
    }

    // API
    const stats = await sendVisit(data["Fingerprint"]);
    document.getElementById("counter").textContent = stats.today;
    document.getElementById("totalCounter").textContent = stats.total;

    const fullStats = await loadStats();
    renderLineChart(fullStats.stats);
    renderHeatmap(fullStats.stats);
}*/

async function init() {

    // 1) Jazyková mutace
    await loadLocale();

    // 2) Detekce zařízení, OS, botů a UTM parametru z URL
    const deviceType  = detectDeviceType();
    const os          = detectOS();
    const isBot       = detectBot();
    const utmCampaign = new URLSearchParams(location.search).get("utm_campaign") || "";

    // 3) Campaign badge — načíst metadata a zobrazit pokud máme slug
    if (utmCampaign) {
        loadCampaignBadge(utmCampaign);
    }

    // 4) Banner podle typu návštěvníka
    if (isBot) {
        showBotBanner();
    } else if (deviceType === "desktop") {
        showDesktopBanner();
    }

    // 4) Získání strukturovaných fingerprint dat
    const data = await getFingerprintData();

    // 5) Vykreslení fingerprintu do kategorií
    renderFingerprint(data);

    // 6) Poslání fingerprintu na backend (včetně OS, bot flagu a UTM)
    const stats = await sendVisit(data.fingerprint, deviceType, os, isBot, utmCampaign);

    // 7) Zobrazení dnešního počtu
    document.getElementById("counter").textContent = stats.today;

    // 8) Returning visitor banner
    if (!isBot && stats.isReturning) {
        showReturningBanner();
    }

    // 9) CF geodata — přidat do síťové sekce fingerprintu
    if (stats.geo) {
        const geo = stats.geo;
        const networkEl = document.getElementById("fp-network");
        if (networkEl) {
            const items = [];
            if (geo.city)    items.push({ k: t("geo.city"),  v: geo.city });
            if (geo.region && geo.region !== geo.city)
                             items.push({ k: t("geo.region"), v: geo.region });
            if (geo.asOrg)   items.push({ k: t("geo.isp"),    v: geo.asOrg });
            if (geo.isEU !== undefined)
                             items.push({ k: t("geo.eu"),      v: geo.isEU ? t("geo.yes") : t("geo.no") });

            for (const { k, v } of items) {
                const li = document.createElement("li");
                const strong = document.createElement("strong");
                strong.textContent = k + ":";
                const span = document.createElement("span");
                span.className = "badge bg-secondary";
                span.style.cssText = "display:inline-block;white-space:normal;word-break:break-word;";
                span.textContent = v;
                li.appendChild(strong);
                li.appendChild(document.createTextNode(" "));
                li.appendChild(span);
                networkEl.appendChild(li);
            }
        }
    }

    // 8) Načtení statistik pro grafy
    const fullStats = await loadStats();

    // 9) Dnešní panel — split + progress bar + podmíněná procenta
    const dt = fullStats.deviceToday || {};
    const todayMob  = dt.mobile  || 0;
    const todayDesk = dt.desktop || 0;
    const todaySum  = todayMob + todayDesk || 1;

    setEl("todayMobile",  todayMob);
    setEl("todayDesktop", todayDesk);
    setBar("todayMobileBar",  Math.round(todayMob  / todaySum * 100));
    setBar("todayDesktopBar", Math.round(todayDesk / todaySum * 100));
    if (todaySum > 1) {
        showPct("todayMobilePct",  todayMob,  todaySum);
        showPct("todayDesktopPct", todayDesk, todaySum);
    }

    // 10) Celkový panel — split + progress bar + podmíněná procenta
    const total = fullStats.total || stats.total || 0;
    setEl("totalCounter", total);

    const db = fullStats.deviceBreakdown || {};
    const totalMob  = db.mobile  || 0;
    const totalDesk = db.desktop || 0;
    const totalSum  = totalMob + totalDesk || 1;

    setEl("totalMobile",  totalMob);
    setEl("totalDesktop", totalDesk);
    setBar("totalMobileBar",  Math.round(totalMob  / totalSum * 100));
    setBar("totalDesktopBar", Math.round(totalDesk / totalSum * 100));
    if (totalSum > 1) {
        showPct("totalMobilePct",  totalMob,  totalSum);
        showPct("totalDesktopPct", totalDesk, totalSum);
    }

    // 11) Vykreslení grafů
    renderLineChart(fullStats.stats);
    showChart("visitsChartSpinner", "visitsChart");

    renderHeatmap(fullStats.stats);
    hideSpinner("heatmapSpinner");

    renderDeviceChart(fullStats.deviceBreakdown);
    showChart("deviceChartSpinner", "deviceChart");

    renderOsChart(fullStats.osBreakdown);
    showChart("osChartSpinner", "osChart");

    renderCountryRanking(fullStats.countryRanking || []);
    renderWorldMap(fullStats.countryBreakdown || {});
    showChart("worldMapSpinner", "worldMap");

    if (typeof renderAsnRanking === "function") {
        renderAsnRanking(fullStats.asnRanking || []);
    }
}

// Pomocné funkce pro plnění panelů
function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setBar(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = pct + "%";
}

function showPct(id, val, sum) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = Math.round(val / sum * 100) + " %";
    el.style.display = "block";
}


//init();

document.addEventListener("DOMContentLoaded", async () => {
    await init();	
});

