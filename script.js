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
    if (document.getElementById("deviceChartTitle"))
        document.getElementById("deviceChartTitle").textContent = "Mobile vs. Desktop";
    if (document.getElementById("osChartTitle"))
        document.getElementById("osChartTitle").textContent = "Operating Systems";
    if (document.getElementById("faqTitle"))
        document.getElementById("faqTitle").textContent = "FAQ";
    if (document.getElementById("totalMobileLabel"))
        document.getElementById("totalMobileLabel").textContent = "of which mobile";
    if (document.getElementById("totalDesktopLabel"))
        document.getElementById("totalDesktopLabel").textContent = "of which desktop";
    if (document.getElementById("totalLabel"))
        document.getElementById("totalLabel").textContent = "Total visitors";

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
async function sendVisit(fingerprint, deviceType, os, isBot, utmCampaign) {
    const res = await fetch("api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, deviceType, os, isBot, utm_campaign: utmCampaign || null })
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
    if (!container) return;
    container.innerHTML = "";

    const isDark = document.body.classList.contains("dark");
    const emptyColor  = isDark ? "#161b22" : "#ebedf0";
    const labelColor  = isDark ? "#8b949e" : "#57606a";
    const borderColor = isDark ? "#0d1117" : "#ffffff";

    // Dny v týdnu (Po–Ne), česky zkráceně
    const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
    // Pořadí: 0 = pondělí ... 6 = neděle (ISO)
    // JS getDay(): 0 = neděle, 1 = pondělí … převedeme na ISO
    const jsToISO = d => (d + 6) % 7; // 0=Po, 6=Ne

    // Sestavit slovník datum→počet ze stats pole
    const countByDay = {};
    for (const s of stats) countByDay[s.day] = s.count;

    // Zjistit rozsah — chceme zobrazit posledních ~16 týdnů (112 dní)
    // Zaokrouhlíme konec na nejbližší neděli, začátek 16 týdnů zpět
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Konec gridu = nejbližší budoucí nebo dnešní neděle (ISO den 6)
    const endDate = new Date(today);
    const todayISO = jsToISO(today.getDay());
    endDate.setDate(endDate.getDate() + (6 - todayISO)); // posun na neděli

    // Začátek = 15 úplných týdnů + aktuální (celkem 16 sloupců)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7 * 15 - 6); // pondělí 16 týdnů zpět

    // Shromáždit všechna data do pole [Po,Út,...,Ne] × týdny
    const weeks = [];
    let current = new Date(startDate);
    while (current <= endDate) {
        const week = [];
        for (let d = 0; d < 7; d++) {
            const key = current.toISOString().slice(0, 10);
            const isFuture = current > today;
            week.push({
                date: new Date(current),
                key,
                count: isFuture ? null : (countByDay[key] || 0)
            });
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
    }

    const CELL  = 13; // px velikost čtverce
    const GAP   = 3;  // px mezera
    const LABEL_W = 24; // px šířka sloupce s dny
    const LABEL_H = 16; // px výška řádku s měsíci

    const cols = weeks.length;
    const rows = 7;
    const svgW = LABEL_W + cols * (CELL + GAP);
    const svgH = LABEL_H + rows * (CELL + GAP);

    // Max pro škálování barev
    const allCounts = Object.values(countByDay).filter(v => v > 0);
    const maxCount = allCounts.length ? Math.max(...allCounts) : 1;

    // Barva buňky podle počtu (5 úrovní jako GitHub)
    function cellColor(count) {
        if (count === null) return "transparent"; // budoucí
        if (count === 0)    return emptyColor;
        const ratio = count / maxCount;
        if (ratio < 0.25) return isDark ? "#0e4429" : "#9be9a8";
        if (ratio < 0.50) return isDark ? "#006d32" : "#40c463";
        if (ratio < 0.75) return isDark ? "#26a641" : "#30a14e";
        return isDark ? "#39d353" : "#216e39";
        // Používáme zelenou škálu jako GitHub — je čitelnější než modrá pro intenzitu
    }

    // SVG sestavit jako string
    const rects = [];

    // Popisky dní (Po, St, Pá — každý druhý pro úsporu místa)
    [0, 2, 4, 6].forEach(i => {
        const y = LABEL_H + i * (CELL + GAP) + CELL * 0.75;
        rects.push(`<text x="${LABEL_W - 4}" y="${y}" text-anchor="end"
            font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">${DAY_LABELS[i]}</text>`);
    });

    // Popisky měsíců — zobrazíme jen když se změní měsíc
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const x = LABEL_W + wi * (CELL + GAP);
        const firstDay = week[0].date; // pondělí tohoto týdne
        if (firstDay.getMonth() !== lastMonth) {
            lastMonth = firstDay.getMonth();
            const monthNames = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];
            rects.push(`<text x="${x}" y="${LABEL_H - 3}" font-size="9"
                fill="${labelColor}" font-family="system-ui,sans-serif">${monthNames[firstDay.getMonth()]}</text>`);
        }

        // Buňky týdne
        week.forEach((day, di) => {
            const y = LABEL_H + di * (CELL + GAP);
            const color = cellColor(day.count);
            const isFuture = day.count === null;
            const tooltipText = isFuture ? "" : `${day.key}: ${day.count} návštěv`;

            rects.push(`<rect
                x="${x}" y="${y}"
                width="${CELL}" height="${CELL}"
                rx="2" ry="2"
                fill="${color}"
                stroke="${borderColor}"
                stroke-width="1"
                ${tooltipText ? `data-tip="${tooltipText}"` : ""}
            />`);
        });
    });

    // Legenda
    const legendX = LABEL_W;
    const legendY = svgH + 8;
    const levels = [0, 0.2, 0.45, 0.7, 1.0];
    const legendItems = levels.map((v, i) => {
        const color = v === 0 ? emptyColor : cellColor(Math.ceil(v * maxCount));
        const lx = legendX + i * (CELL + GAP);
        return `<rect x="${lx}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" fill="${color}" stroke="${borderColor}" stroke-width="1"/>`;
    }).join("");

    const svgTotal = svgH + CELL + 16;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${svgW} ${svgTotal}"
        style="width:100%;max-width:${svgW}px;display:block;">
        ${rects.join("\n")}
        <text x="${legendX - 2}" y="${legendY + CELL * 0.8}" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif" text-anchor="end">méně</text>
        ${legendItems}
        <text x="${legendX + levels.length * (CELL + GAP) + 2}" y="${legendY + CELL * 0.8}" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">více</text>
    </svg>`;

    container.innerHTML = svg;

    // Tooltips — přes title atributy nebo vlastní hover
    container.querySelectorAll("rect[data-tip]").forEach(rect => {
        rect.addEventListener("mouseenter", e => {
            const tip = document.createElement("div");
            tip.id = "heatTip";
            tip.textContent = rect.getAttribute("data-tip");
            tip.style.cssText = `position:fixed;background:#1c2128;color:#c9d1d9;
                border:1px solid #30363d;border-radius:6px;padding:4px 8px;
                font-size:0.75rem;pointer-events:none;z-index:9999;white-space:nowrap;`;
            document.body.appendChild(tip);
        });
        rect.addEventListener("mousemove", e => {
            const tip = document.getElementById("heatTip");
            if (tip) {
                tip.style.left = (e.clientX + 12) + "px";
                tip.style.top  = (e.clientY - 28) + "px";
            }
        });
        rect.addEventListener("mouseleave", () => {
            document.getElementById("heatTip")?.remove();
        });
    });
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
            <strong style="color:#58a6ff;">Vypadá to, že jsi na počítači</strong>
            <p style="margin:4px 0 0;color:#8b949e;font-size:0.9rem;">
                QR kódy se skenují hlavně mobilem — tady je dobrý. Statistiky návštěvnosti
                počítají desktop a mobil zvlášť, takže tato návštěva se projeví v kategorii
                <em>Desktop</em>. Pokud ti přesto záleží na tom, co se o tobě prozrazuje,
                čti dál — platí to pro každé zařízení.
            </p>
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
            <strong style="color:#f85149;">Detekován automatizovaný přístup</strong>
            <p style="margin:4px 0 0;color:#8b949e;font-size:0.9rem;">
                Zdá se, že tuto stránku navštěvuje bot nebo automatizovaný nástroj.
                Tato návštěva se nezapočítá do statistik, ale je zalogována pro audit.
            </p>
        </div>
    `;

    const container = document.querySelector(".container");
    const title = document.getElementById("title");
    container.insertBefore(banner, title.nextSibling);
}

// ---------------------------
// Grafy — device & OS
// ---------------------------
function renderDeviceChart(deviceBreakdown) {
    const canvas = document.getElementById("deviceChart");
    if (!canvas || !deviceBreakdown) return;

    const isDark = document.body.classList.contains("dark");
    const labelColor = isDark ? "#c9d1d9" : "#24292f";

    new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: ["Mobil", "Desktop", "Neznámé"],
            datasets: [{
                data: [
                    deviceBreakdown.mobile || 0,
                    deviceBreakdown.desktop || 0,
                    deviceBreakdown.unknown || 0
                ],
                backgroundColor: ["#3fb950", "#58a6ff", "#8b949e"],
                borderColor: isDark ? "#0d1117" : "#ffffff",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: labelColor } }
            }
        }
    });
}

function renderOsChart(osBreakdown) {
    const canvas = document.getElementById("osChart");
    if (!canvas || !osBreakdown) return;

    const isDark = document.body.classList.contains("dark");
    const labelColor = isDark ? "#c9d1d9" : "#24292f";

    const labels = ["Android", "iOS", "Windows", "Mac", "Linux", "Neznámé"];
    const values = [
        osBreakdown.android || 0,
        osBreakdown.ios || 0,
        osBreakdown.windows || 0,
        osBreakdown.mac || 0,
        osBreakdown.linux || 0,
        osBreakdown.unknown || 0
    ];
    const colors = ["#3fb950", "#58a6ff", "#0078d4", "#a371f7", "#f0883e", "#8b949e"];

    new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: isEnglish ? "Visits by OS" : "Návštěvy dle OS",
                data: values,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: labelColor },
                    grid: { color: isDark ? "#21262d" : "#e1e4e8" }
                },
                x: {
                    ticks: { color: labelColor },
                    grid: { display: false }
                }
            }
        }
    });
}

// ---------------------------
// Žebříček zemí
// ---------------------------
function countryFlag(cc) {
    // Převod ISO kódu na emoji vlajku
    if (!cc || cc === "unknown" || cc.length !== 2) return "🌍";
    return cc.toUpperCase().replace(/./g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 127397)
    );
}

function renderCountryRanking(ranking) {
    const el = document.getElementById("countryRanking");
    if (!el) return;

    if (!ranking || ranking.length === 0) {
        el.innerHTML = '<p style="color:#8b949e;font-size:0.8rem;">Zatím žádná data &ndash; nasbírají se po nasazení nové verze.</p>';
        return;
    }

    const max = ranking[0]?.count || 1;
    const top = ranking.slice(0, 10);

    el.innerHTML = top.map((item, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:0.75rem;color:#8b949e;width:16px;text-align:right;">${i + 1}</span>
            <span style="font-size:1.1rem;">${countryFlag(item.cc)}</span>
            <span style="font-size:0.8rem;min-width:28px;color:#8b949e;">${item.cc}</span>
            <div class="country-bar-wrap">
                <div class="country-bar-fill" style="width:${Math.round(item.count / max * 100)}%"></div>
            </div>
            <span style="font-size:0.8rem;font-weight:600;min-width:24px;text-align:right;">${item.count}</span>
        </div>
    `).join("");
}

// ---------------------------
// Mapa světa (Chart.js Geo)
// ---------------------------
async function renderWorldMap(countryBreakdown) {
    const canvas = document.getElementById("worldMap");
    if (!canvas) return;

    // Počkáme až se načte geo plugin (je async v HTML)
    if (typeof ChartGeo === "undefined") {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof ChartGeo !== "undefined") { clearInterval(check); resolve(); }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 3000);
        });
    }

    if (typeof ChartGeo === "undefined") {
        // Fallback — plugin se nenačetl, zobrazíme jen žebříček
        canvas.style.display = "none";
        return;
    }

    // Načíst GeoJSON světa
    let countries;
    try {
        const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
        const topology = await res.json();
        countries = ChartGeo.topojson.feature(topology, topology.objects.countries).features;
    } catch {
        canvas.style.display = "none";
        return;
    }

    // ISO numeric → ISO alpha-2 mapa pro nejčastější země
    // (world-atlas používá numerické kódy, my máme alpha-2 z CF)
    const numericToAlpha2 = {
        "040":"AT","056":"BE","100":"BG","191":"HR","196":"CY","203":"CZ",
        "208":"DK","233":"EE","246":"FI","250":"FR","276":"DE","300":"GR",
        "348":"HU","372":"IE","380":"IT","428":"LV","440":"LT","442":"LU",
        "470":"MT","528":"NL","616":"PL","620":"PT","642":"RO","703":"SK",
        "705":"SI","724":"ES","752":"SE","826":"GB","008":"AL","020":"AD",
        "070":"BA","112":"BY","756":"CH","250":"FR","804":"UA","688":"RS",
        "807":"MK","499":"ME","442":"LU","643":"RU","792":"TR","840":"US",
        "124":"CA","484":"MX","076":"BR","032":"AR","152":"CL","170":"CO",
        "604":"PE","858":"UY","356":"IN","156":"CN","392":"JP","410":"KR",
        "036":"AU","554":"NZ","710":"ZA","818":"EG","566":"NG","404":"KE"
    };

    const isDark = document.body.classList.contains("dark");

    new Chart(canvas, {
        type: "choropleth",
        data: {
            labels: countries.map(d => d.properties.name),
            datasets: [{
                label: isEnglish ? "Mobile visitors" : "Mobilní návštěvníci",
                data: countries.map(d => {
                    const alpha2 = numericToAlpha2[String(d.id).padStart(3, "0")];
                    return {
                        feature: d,
                        value: alpha2 ? (countryBreakdown[alpha2] || 0) : 0
                    };
                }),
                backgroundColor(ctx) {
                    if (!ctx.raw) return isDark ? "#21262d" : "#e1e4e8";
                    const v = ctx.raw.value;
                    if (v === 0) return isDark ? "#21262d" : "#e1e4e8";
                    // Modrá škála podle hodnoty
                    const alpha = Math.min(0.2 + v * 0.15, 1);
                    return `rgba(88,166,255,${alpha})`;
                },
                borderColor: isDark ? "#30363d" : "#c8ccd0",
                borderWidth: 0.5
            }]
        },
        options: {
            showOutline: false,
            showGraticule: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            return `${ctx.raw.feature.properties.name}: ${ctx.raw.value}`;
                        }
                    }
                }
            },
            scales: {
                projection: { axis: "x", projection: "naturalEarth1" }
            }
        }
    });
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

        li.innerHTML = `
            <strong>${translateKey(key)}:</strong>
            <span class="badge bg-${badgeType}"
                  style="display:inline-block;${extraStyle}"
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

    // 1) Jazyková mutace
    if (isEnglish) applyEnglishTexts();

    // 2) Detekce zařízení, OS, botů a UTM parametru z URL
    const deviceType  = detectDeviceType();
    const os          = detectOS();
    const isBot       = detectBot();
    const utmCampaign = new URLSearchParams(location.search).get("utm_campaign") || "";

    // 3) Banner podle typu návštěvníka
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
    renderHeatmap(fullStats.stats);
    renderDeviceChart(fullStats.deviceBreakdown);
    renderOsChart(fullStats.osBreakdown);
    renderCountryRanking(fullStats.countryRanking || []);
    renderWorldMap(fullStats.countryBreakdown || {});
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

