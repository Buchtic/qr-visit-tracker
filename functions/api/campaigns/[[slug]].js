// functions/api/campaigns/[[slug]].js
//
// Veřejné endpointy (bez auth):
//   GET  /api/campaigns/{slug}   → statistiky kampaně (pro /kampan/ stránku)
//
// Admin endpointy — chráněné CF Access (/admin/*):
//   GET  /api/campaigns          → seznam všech kampaní  ← NOVĚ jen přes admin token
//   POST /api/campaigns          → vytvořit kampaň       ← NOVĚ jen přes admin token
//
// Ochrana před neautorizovaným přístupem k admin operacím:
// Požadavek musí obsahovat hlavičku CF-Access-Jwt-Assertion (nastavuje CF Access automaticky)
// nebo specifický admin token v hlavičce X-Admin-Token.

function generateSlug() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

// Ověřit že request přišel přes CF Access (nebo má admin token)
function isAdminRequest(request, env) {
    // CF Access nastaví tuto hlavičku pro stránky chráněné CF Access
    const cfJwt = request.headers.get("CF-Access-Jwt-Assertion");
    if (cfJwt) return true;

    // CF Access cookie — dostupná na všech cestách domény
    // Fetch z admin stránky ji posílá automaticky přes credentials: "include"
    const cookie = request.headers.get("Cookie") || "";
    if (cookie.includes("CF_Authorization=")) return true;

    // Záložní: vlastní admin token (nastav jako CF Pages secret: ADMIN_TOKEN)
    const adminToken = request.headers.get("X-Admin-Token");
    if (env.ADMIN_TOKEN && adminToken === env.ADMIN_TOKEN) return true;

    return false;
}

// Escapovat HTML pro bezpečné vložení do innerHTML
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);

    const parts = url.pathname.replace(/\/+$/, "").split("/");
    const slug = parts[parts.length - 1] === "campaigns" ? null : parts[parts.length - 1];

    if (slug) {
        // --- Veřejné: statistiky konkrétní kampaně ---
        // Validace slug formátu — jen alfanumerické, max 64 znaků
        if (!/^[a-z0-9]{1,64}$/.test(slug)) {
            return new Response(JSON.stringify({ error: "Invalid slug" }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const meta = await env.CAMPAIGNS.get(`campaign:${slug}`);
        if (!meta) {
            return new Response(JSON.stringify({ error: "Campaign not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const campaign = JSON.parse(meta);
        const total = parseInt(await env.CAMPAIGNS.get(`campaign-hits:${slug}`) || "0");

        // Posledních 30 dní
        const stats = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const count = parseInt(await env.CAMPAIGNS.get(`campaign-day:${slug}:${key}`) || "0");
            stats.push({ day: key, count });
        }

        const deviceBreakdown = {
            mobile:  parseInt(await env.CAMPAIGNS.get(`campaign-device:${slug}:mobile`)  || "0"),
            desktop: parseInt(await env.CAMPAIGNS.get(`campaign-device:${slug}:desktop`) || "0")
        };

        const countryBreakdown = {};
        let cursor;
        do {
            const res = await env.CAMPAIGNS.list({ prefix: `campaign-country:${slug}:`, cursor, limit: 1000 });
            for (const item of res.keys) {
                const cc = item.name.replace(`campaign-country:${slug}:`, "");
                countryBreakdown[cc] = parseInt(await env.CAMPAIGNS.get(item.name) || "0");
            }
            cursor = res.list_complete ? null : res.cursor;
        } while (cursor);

        const countryRanking = Object.entries(countryBreakdown)
            .map(([cc, count]) => ({ cc, count }))
            .sort((a, b) => b.count - a.count);

        // Vrátit jen escapovaná data (ochrana i pro JSON konzumentů)
        return new Response(
            JSON.stringify({
                slug,
                name: escapeHtml(campaign.name),
                description: escapeHtml(campaign.description || ""),
                startDate: campaign.startDate,
                createdAt: campaign.createdAt,
                total, stats, deviceBreakdown, countryBreakdown, countryRanking
            }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
    }

    // --- Admin: seznam všech kampaní — vyžaduje auth ---
    if (!isAdminRequest(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const list = await env.CAMPAIGNS.list({ prefix: "campaign:", limit: 500 });
    const campaigns = [];
    for (const item of list.keys) {
        if (item.name.split(":").length !== 2) continue;
        const raw = await env.CAMPAIGNS.get(item.name);
        if (!raw) continue;
        const s = item.name.replace("campaign:", "");
        const m = JSON.parse(raw);
        const total   = parseInt(await env.CAMPAIGNS.get(`campaign-hits:${s}`) || "0");
        const mobile  = parseInt(await env.CAMPAIGNS.get(`campaign-device:${s}:mobile`)  || "0");
        const desktop = parseInt(await env.CAMPAIGNS.get(`campaign-device:${s}:desktop`) || "0");
        campaigns.push({
            slug: s,
            name: escapeHtml(m.name),
            description: escapeHtml(m.description || ""),
            startDate: m.startDate,
            createdAt: m.createdAt,
            total, mobile, desktop
        });
    }
    campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(
        JSON.stringify({ campaigns }),
        { headers: { "Content-Type": "application/json" } }
    );
}

export async function onRequestPost(context) {
    const { request, env } = context;

    // POST vyžaduje admin auth
    if (!isAdminRequest(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    let body;
    try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const name = (body.name || "").trim().slice(0, 200);
    if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Validace startDate formátu
    const startDate = body.startDate && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
        ? body.startDate
        : new Date().toISOString().slice(0, 10);

    const slug = generateSlug();
    const campaign = {
        name,
        description: (body.description || "").trim().slice(0, 500),
        startDate,
        createdAt: new Date().toISOString()
    };

    await env.CAMPAIGNS.put(`campaign:${slug}`, JSON.stringify(campaign));

    return new Response(
        JSON.stringify({ slug, ...campaign }),
        { status: 201, headers: { "Content-Type": "application/json" } }
    );
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
        }
    });
}

export async function onRequestDelete(context) {
    const { env, request } = context;

    if (!isAdminRequest(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const parts = url.pathname.replace(/\/+$/, "").split("/");
    const slug = parts[parts.length - 1];

    if (!slug || slug === "campaigns" || !/^[a-z0-9]{1,64}$/.test(slug)) {
        return new Response(JSON.stringify({ error: "Invalid slug" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Ověřit že kampaň existuje
    const meta = await env.CAMPAIGNS.get(`campaign:${slug}`);
    if (!meta) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Smazat metadata
    await env.CAMPAIGNS.delete(`campaign:${slug}`);
    await env.CAMPAIGNS.delete(`campaign-hits:${slug}`);

    // Smazat denní statistiky (posledních 365 dní)
    const now = new Date();
    const delPromises = [];
    for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        delPromises.push(env.CAMPAIGNS.delete(`campaign-day:${slug}:${d.toISOString().slice(0, 10)}`));
    }

    // Smazat device breakdown
    delPromises.push(env.CAMPAIGNS.delete(`campaign-device:${slug}:mobile`));
    delPromises.push(env.CAMPAIGNS.delete(`campaign-device:${slug}:desktop`));

    // Smazat country breakdown
    let cursor;
    do {
        const list = await env.CAMPAIGNS.list({ prefix: `campaign-country:${slug}:`, cursor, limit: 1000 });
        for (const item of list.keys) {
            delPromises.push(env.CAMPAIGNS.delete(item.name));
        }
        cursor = list.list_complete ? null : list.cursor;
    } while (cursor);

    await Promise.all(delPromises);

    return new Response(
        JSON.stringify({ success: true, slug }),
        { headers: { "Content-Type": "application/json" } }
    );
}
