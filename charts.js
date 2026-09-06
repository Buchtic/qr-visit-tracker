// charts.js — sdílené funkce pro grafy a geo
// Načítají oba soubory: script.js (veřejná stránka) i admin/index.html

// ----------------------------------------
// Čárový graf návštěvnosti
// ----------------------------------------
function renderLineChart(stats, canvasId = "visitsChart") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const isDark = document.body.classList.contains("dark");
    const labelColor = isDark ? "#c9d1d9" : "#24292f";

    new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: stats.map(s => s.day),
            datasets: [{
                label: "Unikátní návštěvy",
                data: stats.map(s => s.count),
                borderColor: "#58a6ff",
                backgroundColor: "rgba(88,166,255,0.15)",
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: isDark ? "#21262d" : "#e1e4e8" } },
                x: { ticks: { color: labelColor, maxRotation: 45 }, grid: { display: false } }
            },
            plugins: { legend: { labels: { color: labelColor } } }
        }
    });
}

// ----------------------------------------
// Heatmapa (GitHub-style)
// ----------------------------------------
function renderHeatmap(stats, containerId = "heatmap") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const isDark = document.body.classList.contains("dark");
    const emptyColor  = isDark ? "#161b22" : "#ebedf0";
    const labelColor  = isDark ? "#8b949e" : "#57606a";
    const borderColor = isDark ? "#0d1117" : "#ffffff";

    const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
    const jsToISO = d => (d + 6) % 7;

    const countByDay = {};
    for (const s of stats) countByDay[s.day] = s.count;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    const todayISO = jsToISO(today.getDay());
    endDate.setDate(endDate.getDate() + (6 - todayISO));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7 * 15 - 6);

    const weeks = [];
    let current = new Date(startDate);
    while (current <= endDate) {
        const week = [];
        for (let d = 0; d < 7; d++) {
            const key = current.toISOString().slice(0, 10);
            week.push({ date: new Date(current), key, count: current > today ? null : (countByDay[key] || 0) });
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
    }

    const CELL = 13, GAP = 3, LABEL_W = 24, LABEL_H = 16;
    const cols = weeks.length;
    const svgW = LABEL_W + cols * (CELL + GAP);
    const svgH = LABEL_H + 7 * (CELL + GAP);
    const allCounts = Object.values(countByDay).filter(v => v > 0);
    const maxCount = allCounts.length ? Math.max(...allCounts) : 1;

    function cellColor(count) {
        if (count === null) return "transparent";
        if (count === 0) return emptyColor;
        const r = count / maxCount;
        if (r < 0.25) return isDark ? "#0e4429" : "#9be9a8";
        if (r < 0.50) return isDark ? "#006d32" : "#40c463";
        if (r < 0.75) return isDark ? "#26a641" : "#30a14e";
        return isDark ? "#39d353" : "#216e39";
    }

    const rects = [];
    [0, 2, 4, 6].forEach(i => {
        const y = LABEL_H + i * (CELL + GAP) + CELL * 0.75;
        rects.push(`<text x="${LABEL_W - 4}" y="${y}" text-anchor="end" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">${DAY_LABELS[i]}</text>`);
    });

    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const x = LABEL_W + wi * (CELL + GAP);
        const firstDay = week[0].date;
        if (firstDay.getMonth() !== lastMonth) {
            lastMonth = firstDay.getMonth();
            const monthNames = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];
            rects.push(`<text x="${x}" y="${LABEL_H - 3}" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">${monthNames[firstDay.getMonth()]}</text>`);
        }
        week.forEach((day, di) => {
            const y = LABEL_H + di * (CELL + GAP);
            rects.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2"
                fill="${cellColor(day.count)}" stroke="${borderColor}" stroke-width="1"
                ${day.count !== null ? `data-tip="${day.key}: ${day.count} návštěv"` : ""}/>`);
        });
    });

    const legendX = LABEL_W, legendY = svgH + 8;
    const levels = [0, 0.2, 0.45, 0.7, 1.0];
    const legendItems = levels.map((v, i) => {
        const color = v === 0 ? emptyColor : cellColor(Math.ceil(v * maxCount));
        return `<rect x="${legendX + i * (CELL + GAP)}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" fill="${color}" stroke="${borderColor}" stroke-width="1"/>`;
    }).join("");

    const svgTotal = svgH + CELL + 16;
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgTotal}" style="width:100%;max-width:${svgW}px;display:block;">
        ${rects.join("\n")}
        <text x="${legendX - 2}" y="${legendY + CELL * 0.8}" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif" text-anchor="end">méně</text>
        ${legendItems}
        <text x="${legendX + levels.length * (CELL + GAP) + 2}" y="${legendY + CELL * 0.8}" font-size="9" fill="${labelColor}" font-family="system-ui,sans-serif">více</text>
    </svg>`;

    container.querySelectorAll("rect[data-tip]").forEach(rect => {
        rect.addEventListener("mouseenter", () => {
            const tip = document.createElement("div");
            tip.id = "heatTip";
            tip.textContent = rect.getAttribute("data-tip");
            tip.style.cssText = "position:fixed;background:#1c2128;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:4px 8px;font-size:0.75rem;pointer-events:none;z-index:9999;white-space:nowrap;";
            document.body.appendChild(tip);
        });
        rect.addEventListener("mousemove", e => {
            const tip = document.getElementById("heatTip");
            if (tip) { tip.style.left = (e.clientX + 12) + "px"; tip.style.top = (e.clientY - 28) + "px"; }
        });
        rect.addEventListener("mouseleave", () => document.getElementById("heatTip")?.remove());
    });
}

// ----------------------------------------
// Donut — Mobil vs. Desktop
// ----------------------------------------
function renderDeviceChart(deviceBreakdown, canvasId = "deviceChart") {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !deviceBreakdown) return;
    const isDark = document.body.classList.contains("dark");

    new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: ["Mobil", "Desktop", "Neznámé"],
            datasets: [{
                data: [deviceBreakdown.mobile || 0, deviceBreakdown.desktop || 0, deviceBreakdown.unknown || 0],
                backgroundColor: ["#3fb950", "#58a6ff", "#8b949e"],
                borderColor: isDark ? "#0d1117" : "#ffffff",
                borderWidth: 2
            }]
        },
        options: { plugins: { legend: { labels: { color: isDark ? "#c9d1d9" : "#24292f" } } } }
    });
}

// ----------------------------------------
// Sloupcový graf — OS
// ----------------------------------------
function renderOsChart(osBreakdown, canvasId = "osChart") {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !osBreakdown) return;
    const isDark = document.body.classList.contains("dark");
    const labelColor = isDark ? "#c9d1d9" : "#24292f";

    new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: ["Android", "iOS", "Windows", "Mac", "Linux", "Neznámé"],
            datasets: [{
                label: "Návštěvy dle OS",
                data: [osBreakdown.android||0, osBreakdown.ios||0, osBreakdown.windows||0, osBreakdown.mac||0, osBreakdown.linux||0, osBreakdown.unknown||0],
                backgroundColor: ["#3fb950","#58a6ff","#0078d4","#a371f7","#f0883e","#8b949e"],
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: isDark ? "#21262d" : "#e1e4e8" } },
                x: { ticks: { color: labelColor }, grid: { display: false } }
            }
        }
    });
}

// ----------------------------------------
// Vlajky + žebříček zemí
// ----------------------------------------
function countryFlag(cc) {
    if (!cc || cc === "unknown" || cc.length !== 2) return "🌍";
    return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function renderCountryRanking(ranking, containerId = "countryRanking", limit = 10) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!ranking || ranking.length === 0) {
        el.innerHTML = '<p style="color:#8b949e;font-size:0.8rem;">Zatím žádná data &ndash; nasbírají se po nasazení.</p>';
        return;
    }
    const max = ranking[0]?.count || 1;
    el.innerHTML = ranking.slice(0, limit).map((item, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:0.72rem;color:#8b949e;width:16px;text-align:right;">${i + 1}</span>
            <span style="font-size:1.1rem;">${countryFlag(item.cc)}</span>
            <span style="font-size:0.8rem;min-width:28px;color:#8b949e;">${item.cc}</span>
            <div style="flex:1;background:#21262d;border-radius:3px;height:5px;overflow:hidden;">
                <div style="height:100%;background:#58a6ff;border-radius:3px;width:${Math.round(item.count/max*100)}%"></div>
            </div>
            <span style="font-size:0.8rem;font-weight:600;min-width:24px;text-align:right;">${item.count}</span>
        </div>
    `).join("");
}

// ----------------------------------------
// Mapa světa (Chart.js Geo)
// ----------------------------------------
const NUMERIC_TO_ALPHA2 = {
    "040":"AT","056":"BE","100":"BG","191":"HR","196":"CY","203":"CZ",
    "208":"DK","233":"EE","246":"FI","250":"FR","276":"DE","300":"GR",
    "348":"HU","372":"IE","380":"IT","428":"LV","440":"LT","442":"LU",
    "470":"MT","528":"NL","616":"PL","620":"PT","642":"RO","703":"SK",
    "705":"SI","724":"ES","752":"SE","826":"GB","008":"AL","020":"AD",
    "070":"BA","112":"BY","756":"CH","804":"UA","688":"RS","807":"MK",
    "499":"ME","643":"RU","792":"TR","840":"US","124":"CA","484":"MX",
    "076":"BR","032":"AR","152":"CL","170":"CO","604":"PE","858":"UY",
    "356":"IN","156":"CN","392":"JP","410":"KR","036":"AU","554":"NZ",
    "710":"ZA","818":"EG","566":"NG","404":"KE"
};

async function renderWorldMap(countryBreakdown, canvasId = "worldMap") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (typeof ChartGeo === "undefined") {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof ChartGeo !== "undefined") { clearInterval(check); resolve(); }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 3000);
        });
    }
    if (typeof ChartGeo === "undefined") { canvas.style.display = "none"; return; }

    let countries;
    try {
        const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
        const topology = await res.json();
        countries = ChartGeo.topojson.feature(topology, topology.objects.countries).features;
    } catch { canvas.style.display = "none"; return; }

    const isDark = document.body.classList.contains("dark");

    new Chart(canvas, {
        type: "choropleth",
        data: {
            labels: countries.map(d => d.properties.name),
            datasets: [{
                label: "Návštěvníci",
                data: countries.map(d => {
                    const alpha2 = NUMERIC_TO_ALPHA2[String(d.id).padStart(3, "0")];
                    return { feature: d, value: alpha2 ? (countryBreakdown[alpha2] || 0) : 0 };
                }),
                backgroundColor(ctx) {
                    if (!ctx.raw) return isDark ? "#21262d" : "#e1e4e8";
                    const v = ctx.raw.value;
                    if (v === 0) return isDark ? "#21262d" : "#e1e4e8";
                    return `rgba(88,166,255,${Math.min(0.2 + v * 0.15, 1)})`;
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
                tooltip: { callbacks: { label(ctx) { return `${ctx.raw.feature.properties.name}: ${ctx.raw.value}`; } } }
            },
            scales: { projection: { axis: "x", projection: "naturalEarth1" } }
        }
    });
}

// ----------------------------------------
// ASN / ISP žebříček
// ----------------------------------------
function renderAsnRanking(ranking, containerId = "asnRanking", limit = 10) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!ranking || ranking.length === 0) {
        el.innerHTML = '<p style="color:#8b949e;font-size:0.8rem;">Zatím žádná data.</p>';
        return;
    }
    const max = ranking[0]?.count || 1;
    el.innerHTML = ranking.slice(0, limit).map((item, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
            <span style="font-size:0.72rem;color:#8b949e;width:16px;text-align:right;">${i + 1}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                     title="${item.org}">${item.org}</div>
                <div style="background:#21262d;border-radius:2px;height:4px;margin-top:3px;overflow:hidden;">
                    <div style="height:100%;background:#3fb950;border-radius:2px;width:${Math.round(item.count / max * 100)}%"></div>
                </div>
            </div>
            <span style="font-size:0.8rem;font-weight:600;min-width:24px;text-align:right;flex-shrink:0;">${item.count}</span>
        </div>
    `).join("");
}
