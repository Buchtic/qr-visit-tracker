// ---------------------------
// Dark mode toggle
// ---------------------------
document.getElementById("themeToggle").addEventListener("click", () => {
    const body = document.body;
    const isDark = body.classList.contains("dark");

    body.classList.toggle("dark", !isDark);
    body.classList.toggle("light", isDark);

    document.getElementById("themeToggle").textContent =
        isDark ? "◑" : "☼";
});

// ---------------------------
// Language detection
// ---------------------------
const isEnglish = location.hostname.includes("scanresponsibly.it");
const deviceType = detectDeviceType();
function applyEnglishTexts() {
    document.getElementById("title").textContent = "Don't scan random QR codes";
    document.getElementById("todayLabel").textContent = "Unique visitors today:";
    document.getElementById("totalLabel").textContent = "Total unique visitors";
    document.getElementById("revealTitle").textContent = "What you just revealed";
    document.getElementById("revealText1").textContent =
        "These are technical details your browser automatically sent just because you scanned a QR code.";
    document.getElementById("revealText2").textContent =
        "A QR code is not just an image. It is a gateway that can lead anywhere — and every website you open learns at least this:";
    document.getElementById("whyTitle").textContent = "Why scanning random QR codes is risky";

    document.getElementById("whyList").innerHTML = `
        <li>A QR code can lead to phishing or a malicious website.</li>
        <li>It can trigger a download of harmful files.</li>
        <li>It can trick you into logging into a fake service.</li>
        <li>It can be placed over a legitimate QR code.</li>
        <li><span class="danger">You cannot know where it leads until it's too late.</span></li>
    `;

    document.getElementById("chartTitle").textContent = "Visits over time";
    document.getElementById("heatmapTitle").textContent = "Visit heatmap";

    document.getElementById("nocookiesTitle").textContent = "This project uses 0 cookies";
    document.getElementById("nocookiesText1").textContent =
        "No cookies, no trackers, no analytics. Everything stays in your browser.";
    document.getElementById("nocookiesText2").textContent =
        "The goal is to show how easily any website can collect technical information about your device — without consent.";

    document.getElementById("motivationTitle").textContent = "Why this project exists";
    document.getElementById("motivationText").textContent =
        "People scan QR codes without thinking. This project is a simple demonstration of what you reveal by doing so.";

    document.getElementById("contactTitle").textContent = "Want to collaborate?";
    document.getElementById("contactText").textContent =
        "If you want to extend this project or build your own awareness campaign:";

    document.getElementById("trainingTitle").textContent = "If you want real training…";
    document.getElementById("trainingText").innerHTML =
        `We recommend <strong><a href="https://boit.cz" target="_blank" class="text-decoration-none" style="color:#58a6ff;">BOIT Cyber Security</a></strong>.`;
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
        "Save Data Mode": "Režim šetření dat"
    };

    return map[key] || key; // fallback = anglický klíč
}


// ---------------------------
// API calls
// ---------------------------
async function sendVisit(fingerprint, deviceType) {
    const res = await fetch("api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, deviceType })
    });
    return await res.json();
}

async function loadStats() {
    const res = await fetch("api/stats");
    return await res.json();
}

// ---------------------------
// Charts
// ---------------------------
function renderLineChart(stats) {
    const ctx = document.getElementById("visitsChart").getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: stats.map(s => s.day),
            datasets: [{
                label: isEnglish ? "Unique visits" : "Unikátní návštěvy",
                data: stats.map(s => s.count),
                borderColor: "#58a6ff",
                backgroundColor: "rgba(88,166,255,0.2)",
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderHeatmap(stats) {
    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    const max = Math.max(...stats.map(s => s.count), 1);

    for (const s of stats) {
        const intensity = s.count / max;
        const color = intensity === 0
            ? "#161b22"
            : `rgba(88,166,255,${0.2 + intensity * 0.8})`;

        const div = document.createElement("div");
        div.className = "heatbox";
        div.style.backgroundColor = color;
        div.title = `${s.day}: ${s.count}`;

        container.appendChild(div);
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

        li.innerHTML = `
            <strong>${translateKey(key)}:</strong>
            <span class="badge bg-${badgeType}" 
                  ${window.bootstrap ? 'data-bs-toggle="tooltip" title="' + tooltip + '"' : ""}>
                ${value}
            </span>
        `;

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
    if (isEnglish) applyEnglishTexts();

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

	
    // 1) jazyková mutace
    if (isEnglish) applyEnglishTexts();

    // 2) získání strukturovaných fingerprint dat
    const data = await getFingerprintData();	


    // 3) vykreslení fingerprintu do kategorií
    renderFingerprint(data);

    // 4) poslání fingerprintu na backend
    const stats = await sendVisit(data.fingerprint,data.deviceType);

    // 5) zobrazení dnešního a celkového počtu
    document.getElementById("counter").textContent = stats.today;
    document.getElementById("totalCounter").textContent = stats.total;

    // 6) načtení statistik pro grafy
    const fullStats = await loadStats();

    // 7) vykreslení grafu a heatmapy
    renderLineChart(fullStats.stats);
    renderHeatmap(fullStats.stats);
}


//init();

document.addEventListener("DOMContentLoaded", async () => {
    await init();	
});

