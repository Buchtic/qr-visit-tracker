export async function onRequestGet(context) {
    const { env } = context;

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
        mobile: parseInt(await env.VISIT_COUNTER.get("device-mobile-total") || "0"),
        desktop: parseInt(await env.VISIT_COUNTER.get("device-desktop-total") || "0"),
        unknown: parseInt(await env.VISIT_COUNTER.get("device-unknown-total") || "0")
    };

    // Device breakdown — dnešní (pro split v hlavním panelu)
    const deviceToday = {
        mobile: parseInt(await env.VISIT_COUNTER.get(`device-mobile-${todayKey}`) || "0"),
        desktop: parseInt(await env.VISIT_COUNTER.get(`device-desktop-${todayKey}`) || "0")
    };

    // OS breakdown — celkový
    const osBreakdown = {
        android: parseInt(await env.VISIT_COUNTER.get("os-android-total") || "0"),
        ios: parseInt(await env.VISIT_COUNTER.get("os-ios-total") || "0"),
        windows: parseInt(await env.VISIT_COUNTER.get("os-windows-total") || "0"),
        mac: parseInt(await env.VISIT_COUNTER.get("os-mac-total") || "0"),
        linux: parseInt(await env.VISIT_COUNTER.get("os-linux-total") || "0"),
        unknown: parseInt(await env.VISIT_COUNTER.get("os-unknown-total") || "0")
    };

    return new Response(
        JSON.stringify({ today, total, stats, deviceBreakdown, deviceToday, osBreakdown }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}
