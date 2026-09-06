export async function onRequestGet(context) {
    const { env, request } = context;

    const url = new URL(request.url);
    // deviceFilter: "mobile" (default pro veřejnou stránku), "all" pro admin
    const deviceFilter = url.searchParams.get("device") || "mobile";

    const todayKey = new Date().toISOString().slice(0, 10);

    // Hlavní čítače
    const today = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
    const total = parseInt(await env.VISIT_COUNTER.get("total") || "0");

    // Posledních 30 dní pro graf
    const stats = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().slice(0, 10);
        const count = parseInt(await env.VISIT_COUNTER.get(key) || "0");
        stats.push({ day: key, count });
    }

    // Device breakdown — celkový
    const deviceBreakdown = {
        mobile:  parseInt(await env.VISIT_COUNTER.get("device-mobile-total")  || "0"),
        desktop: parseInt(await env.VISIT_COUNTER.get("device-desktop-total") || "0"),
        unknown: parseInt(await env.VISIT_COUNTER.get("device-unknown-total") || "0")
    };

    // Device breakdown — dnešní
    const deviceToday = {
        mobile:  parseInt(await env.VISIT_COUNTER.get(`device-mobile-${todayKey}`)  || "0"),
        desktop: parseInt(await env.VISIT_COUNTER.get(`device-desktop-${todayKey}`) || "0")
    };

    // OS breakdown
    const osBreakdown = {
        android: parseInt(await env.VISIT_COUNTER.get("os-android-total") || "0"),
        ios:     parseInt(await env.VISIT_COUNTER.get("os-ios-total")     || "0"),
        windows: parseInt(await env.VISIT_COUNTER.get("os-windows-total") || "0"),
        mac:     parseInt(await env.VISIT_COUNTER.get("os-mac-total")     || "0"),
        linux:   parseInt(await env.VISIT_COUNTER.get("os-linux-total")   || "0"),
        unknown: parseInt(await env.VISIT_COUNTER.get("os-unknown-total") || "0")
    };

    // Country breakdown — podle deviceFilter
    // Pro "all" sečteme mobile + desktop + unknown per zemi
    const countryBreakdown = {};
    const deviceTypes = deviceFilter === "all"
        ? ["mobile", "desktop", "unknown"]
        : ["mobile"];

    // Projdeme klíče s prefixem country-{device}-
    for (const dev of deviceTypes) {
        const prefix = `country-${dev}-`;
        let listCursor;
        do {
            const listResult = await env.VISIT_COUNTER.list({ prefix, cursor: listCursor, limit: 1000 });
            for (const item of listResult.keys) {
                const cc = item.name.replace(prefix, ""); // ISO kód země
                const count = parseInt(await env.VISIT_COUNTER.get(item.name) || "0");
                countryBreakdown[cc] = (countryBreakdown[cc] || 0) + count;
            }
            listCursor = listResult.list_complete ? null : listResult.cursor;
        } while (listCursor);
    }

    // Seřadit sestupně pro žebříček
    const countryRanking = Object.entries(countryBreakdown)
        .map(([cc, count]) => ({ cc, count }))
        .sort((a, b) => b.count - a.count);

    // Bot statistiky
    const botTotal = parseInt(await env.VISIT_COUNTER.get("bot-total") || "0");
    const botToday = parseInt(await env.VISIT_COUNTER.get(`bot-${todayKey}`) || "0");
    const botBreakdown = { total: botTotal, today: botToday };

    return new Response(
        JSON.stringify({ today, total, stats, deviceBreakdown, deviceToday, osBreakdown, countryBreakdown, countryRanking, botBreakdown }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}
