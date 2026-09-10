// functions/api/admin/export.js
//
// GET /api/admin/export               → kompletní záloha (CAMPAIGNS + VISIT_COUNTER)
// GET /api/admin/export?ns=campaigns  → jen CAMPAIGNS
// GET /api/admin/export?ns=counter    → jen VISIT_COUNTER agregáty
// GET /api/admin/export?ns=logs       → VISIT_LOGS (výchozí limit 500, max 1000)
//
// Chráněno: CF Access cookie / CF-Access-Jwt-Assertion / X-Admin-Token
// Poznámka: Workers CPU limit 10ms — pro velké datasety použijte R2 Cron backup

export async function onRequestGet(context) {
    const { env, request } = context;

    // Auth — stejná logika jako campaigns.js a logs.js
    const cookie  = request.headers.get("Cookie") || "";
    const cfJwt   = request.headers.get("CF-Access-Jwt-Assertion");
    const token   = request.headers.get("X-Admin-Token");
    const isAdmin = cfJwt
        || cookie.includes("CF_Authorization=")
        || (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN);

    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
            // Záměrně bez CORS hlaviček — admin endpoint
        });
    }

    const url = new URL(request.url);

    // Validace ns parametru — whitelist povolených hodnot
    const VALID_NS = ["all", "campaigns", "counter", "logs"];
    const ns = VALID_NS.includes(url.searchParams.get("ns")) ? url.searchParams.get("ns") : "all";

    // Validace limit parametru pro logy
    const rawLimit = parseInt(url.searchParams.get("limit") || "500", 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 500 : Math.min(rawLimit, 1000);

    const now = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const result = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        namespaces: {}
    };

    // Helper: exportovat KV namespace
    async function dumpNamespace(kvBinding, prefix = "") {
        const data = {};
        let cursor;
        do {
            const list = await kvBinding.list({ prefix, cursor, limit: 1000 });
            for (const item of list.keys) {
                data[item.name] = await kvBinding.get(item.name);
            }
            cursor = list.list_complete ? null : list.cursor;
        } while (cursor);
        return data;
    }

    try {
        if (ns === "all" || ns === "campaigns") {
            result.namespaces.CAMPAIGNS = await dumpNamespace(env.CAMPAIGNS);
        }

        if (ns === "all" || ns === "counter") {
            const counter = {};
            // Pouze trvalé klíče — přeskočit fp: (TTL 48h) a stats-cache: (TTL 5min)
            for (const prefix of ["total", "device-", "os-", "country-", "bot-", "scan-", "asn-"]) {
                Object.assign(counter, await dumpNamespace(env.VISIT_COUNTER, prefix));
            }
            // Denní čítače (začínají rokem)
            Object.assign(counter, await dumpNamespace(env.VISIT_COUNTER, String(new Date().getFullYear())));
            result.namespaces.VISIT_COUNTER = counter;
        }

        if (ns === "logs") {
            const logs = {};
            const list = await env.VISIT_LOGS.list({ prefix: "visit:", limit });
            for (const item of list.keys) {
                logs[item.name] = await env.VISIT_LOGS.get(item.name);
            }
            result.namespaces.VISIT_LOGS = logs;
            result.meta = {
                logsExported: Object.keys(logs).length,
                logsLimit: limit,
                note: "Pro úplný export všech logů použijte R2 Cron backup"
            };
        }

    } catch {
        // Záměrně bez leak error.message — může obsahovat interní KV info
        return new Response(JSON.stringify({ error: "Export failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    const filename = `qr-tracker-backup-${now}${ns !== "all" ? `-${ns}` : ""}.json`;

    return new Response(JSON.stringify(result, null, 2), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${filename}"`,
            // Záměrně BEZ Access-Control-Allow-Origin — export nesmí být dostupný cross-origin
        }
    });
}
