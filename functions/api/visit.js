export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const fingerprint = body.fingerprint;
    const deviceType = body.deviceType || "unknown";

    if (!fingerprint) {
        return new Response(JSON.stringify({ error: "Missing fingerprint" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Klíč pro kontrolu unikátnosti – fingerprint + den
    const uniqueKey = `fp:${todayKey}:${fingerprint}`;
    const alreadySeen = await env.VISIT_COUNTER.get(uniqueKey);

    if (!alreadySeen) {
        // Označit fingerprint jako viděný dnes (TTL 48h stačí)
        await env.VISIT_COUNTER.put(uniqueKey, "1", { expirationTtl: 172800 });

        // Uložit log návštěvy
        const logEntry = JSON.stringify({
            fingerprint,
            deviceType,
            timestamp: Date.now()
        });
        await env.VISIT_LOGS.put(`visit:${Date.now()}:${fingerprint.slice(0, 8)}`, logEntry, {
            expirationTtl: 60 * 60 * 24 * 90 // 90 dní
        });

        // Aktualizovat čítače
        const todayCount = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
        const totalCount = parseInt(await env.VISIT_COUNTER.get("total") || "0");

        await env.VISIT_COUNTER.put(todayKey, String(todayCount + 1));
        await env.VISIT_COUNTER.put("total", String(totalCount + 1));
    }

    // Vrátit aktuální hodnoty
    const today = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
    const total = parseInt(await env.VISIT_COUNTER.get("total") || "0");

    return new Response(
        JSON.stringify({ today, total }),
        {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}
