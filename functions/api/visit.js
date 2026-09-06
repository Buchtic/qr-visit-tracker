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
    const deviceType  = body.deviceType || "unknown";
    const os          = body.os || "unknown";
    const isBot       = body.isBot === true;
    const utmCampaign = (body.utm_campaign || "").trim().toLowerCase().slice(0, 64);

    // Country z Cloudflare hlavičky — automaticky, bez externího API
    // Country z CF — validujeme formát ISO 3166-1 alpha-2
    const rawCountry = (request.cf?.country || "").toUpperCase();
    const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : "unknown";

    // Validace fingerprint — musí být hex string 64 znaků (SHA-256)
    if (!fingerprint || typeof fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(fingerprint)) {
        return new Response(JSON.stringify({ error: "Invalid fingerprint" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Uložit log návštěvy vždy (i boti, i opakované) — pro audit
    const logEntry = JSON.stringify({
        fingerprint,
        deviceType,
        os,
        isBot,
        country,
        utm_campaign: utmCampaign || null,
        timestamp: Date.now()
    });
    await env.VISIT_LOGS.put(
        `visit:${Date.now()}:${fingerprint.slice(0, 8)}`,
        logEntry,
        { expirationTtl: 60 * 60 * 24 * 90 } // 90 dní
    );

    // Boti se nezapočítají do hlavních čítačů, ale sledujeme jejich počet
    if (isBot) {
        const botTotal = parseInt(await env.VISIT_COUNTER.get("bot-total") || "0");
        const botToday = parseInt(await env.VISIT_COUNTER.get(`bot-${todayKey}`) || "0");
        await env.VISIT_COUNTER.put("bot-total", String(botTotal + 1));
        await env.VISIT_COUNTER.put(`bot-${todayKey}`, String(botToday + 1));
    } else {
        const uniqueKey = `fp:${todayKey}:${fingerprint}`;
        const alreadySeen = await env.VISIT_COUNTER.get(uniqueKey);
        const isReturning = !!alreadySeen;

        if (!alreadySeen) {
            // Označit fingerprint jako viděný dnes (TTL 48h)
            await env.VISIT_COUNTER.put(uniqueKey, "1", { expirationTtl: 172800 });

            // Hlavní čítače (celkem, dnes)
            const todayCount = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
            const totalCount = parseInt(await env.VISIT_COUNTER.get("total") || "0");
            await env.VISIT_COUNTER.put(todayKey, String(todayCount + 1));
            await env.VISIT_COUNTER.put("total", String(totalCount + 1));

            // Device čítače
            const deviceValidKey = ["mobile", "desktop"].includes(deviceType) ? deviceType : "unknown";
            const devTotal = parseInt(await env.VISIT_COUNTER.get(`device-${deviceValidKey}-total`) || "0");
            const devToday = parseInt(await env.VISIT_COUNTER.get(`device-${deviceValidKey}-${todayKey}`) || "0");
            await env.VISIT_COUNTER.put(`device-${deviceValidKey}-total`, String(devTotal + 1));
            await env.VISIT_COUNTER.put(`device-${deviceValidKey}-${todayKey}`, String(devToday + 1));

            // OS čítače
            const validOS = ["android", "ios", "windows", "mac", "linux"].includes(os) ? os : "unknown";
            const osTotal = parseInt(await env.VISIT_COUNTER.get(`os-${validOS}-total`) || "0");
            await env.VISIT_COUNTER.put(`os-${validOS}-total`, String(osTotal + 1));

            // Country čítače
            const deviceValidKey2 = ["mobile", "desktop"].includes(deviceType) ? deviceType : "unknown";
            const countryKey = `country-${deviceValidKey2}-${country}`;
            const countryTotal = parseInt(await env.VISIT_COUNTER.get(countryKey) || "0");
            await env.VISIT_COUNTER.put(countryKey, String(countryTotal + 1));

            // UTM kampaň
            if (utmCampaign && env.CAMPAIGNS) {
                const campaignMeta = await env.CAMPAIGNS.get(`campaign:${utmCampaign}`);
                if (campaignMeta) {
                    const hits = parseInt(await env.CAMPAIGNS.get(`campaign-hits:${utmCampaign}`) || "0");
                    await env.CAMPAIGNS.put(`campaign-hits:${utmCampaign}`, String(hits + 1));
                    const dayHits = parseInt(await env.CAMPAIGNS.get(`campaign-day:${utmCampaign}:${todayKey}`) || "0");
                    await env.CAMPAIGNS.put(`campaign-day:${utmCampaign}:${todayKey}`, String(dayHits + 1));
                    const devHits = parseInt(await env.CAMPAIGNS.get(`campaign-device:${utmCampaign}:${deviceValidKey}`) || "0");
                    await env.CAMPAIGNS.put(`campaign-device:${utmCampaign}:${deviceValidKey}`, String(devHits + 1));
                    const ccHits = parseInt(await env.CAMPAIGNS.get(`campaign-country:${utmCampaign}:${country}`) || "0");
                    await env.CAMPAIGNS.put(`campaign-country:${utmCampaign}:${country}`, String(ccHits + 1));
                }
            }
        }

        // Vrátit aktuální hodnoty včetně isReturning flagu
        const today = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
        const total = parseInt(await env.VISIT_COUNTER.get("total") || "0");

        return new Response(
            JSON.stringify({ today, total, isReturning }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
    }

    // Bot response (bez isReturning)
    const today = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
    const total = parseInt(await env.VISIT_COUNTER.get("total") || "0");

    return new Response(
        JSON.stringify({ today, total }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
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
