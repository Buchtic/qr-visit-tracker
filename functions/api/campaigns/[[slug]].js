// functions/api/campaigns/[[slug]].js
// Zachytí:  GET  /api/campaigns           → seznam
//           GET  /api/campaigns/{slug}    → statistiky kampaně
//           POST /api/campaigns           → vytvořit kampaň

function generateSlug() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);

    // Extrahovat slug z URL: /api/campaigns/{slug}
    const parts = url.pathname.replace(/\/+$/, "").split("/");
    const slug = parts[parts.length - 1] === "campaigns" ? null : parts[parts.length - 1];

    if (slug) {
        // --- Statistiky konkrétní kampaně (public) ---
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

        // Country breakdown
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

        return new Response(
            JSON.stringify({ slug, ...campaign, total, stats, deviceBreakdown, countryBreakdown, countryRanking }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
    }

    // --- Seznam všech kampaní (admin) ---
    const list = await env.CAMPAIGNS.list({ prefix: "campaign:", limit: 500 });
    const campaigns = [];
    for (const item of list.keys) {
        if (item.name.split(":").length !== 2) continue; // přeskočit sub-klíče
        const raw = await env.CAMPAIGNS.get(item.name);
        if (!raw) continue;
        const s = item.name.replace("campaign:", "");
        const meta = JSON.parse(raw);
        const total   = parseInt(await env.CAMPAIGNS.get(`campaign-hits:${s}`) || "0");
        const mobile  = parseInt(await env.CAMPAIGNS.get(`campaign-device:${s}:mobile`)  || "0");
        const desktop = parseInt(await env.CAMPAIGNS.get(`campaign-device:${s}:desktop`) || "0");
        campaigns.push({ slug: s, ...meta, total, mobile, desktop });
    }
    campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(
        JSON.stringify({ campaigns }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}

export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const name = (body.name || "").trim();
    if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const slug = generateSlug();
    const campaign = {
        name,
        description: (body.description || "").trim(),
        startDate: body.startDate || new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
    };

    await env.CAMPAIGNS.put(`campaign:${slug}`, JSON.stringify(campaign));

    return new Response(
        JSON.stringify({ slug, ...campaign }),
        { status: 201, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}
