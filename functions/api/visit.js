/*export async function onRequestPost(context) {
    const env = context.env;
    const { fingerprint } = await context.request.json();
    const today = new Date().toISOString().slice(0, 10);

    const totalKey = "total";
    const todayKey = `day:${today}`;
    const fpKey = `fp:${today}:${fingerprint}`;

    const alreadyToday = await env.DB.get(fpKey);

    if (!alreadyToday) {
        await env.DB.put(fpKey, "1");

        const todayCount = parseInt(await env.DB.get(todayKey) || "0") + 1;
        await env.DB.put(todayKey, todayCount.toString());

        const totalCount = parseInt(await env.DB.get(totalKey) || "0") + 1;
        await env.DB.put(totalKey, totalCount.toString());
    }

    const todayCount = parseInt(await env.DB.get(todayKey) || "0");
    const totalCount = parseInt(await env.DB.get(totalKey) || "0");

    return new Response(JSON.stringify({
        today: todayCount,
        total: totalCount
    }), {
        headers: { "Content-Type": "application/json" }
    });
}
*/

export async function onRequestPost(context) {
    const { request, env } = context;

    const body = await request.json();
    const fingerprint = body.fingerprint;
    const deviceType = body.deviceType || "unknown";

    // --- 1) ULOŽENÍ LOGU NÁVŠTĚVY ---
    const logEntry = {
        fingerprint,
        deviceType,
        timestamp: Date.now()
    };

    // Každý log jako samostatný klíč
    await env.VISIT_LOGS.put(
        `visit:${logEntry.timestamp}`,
        JSON.stringify(logEntry)
    );

    // --- 2) NAČTENÍ AGREGACÍ ---
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const todayCount = parseInt(await env.VISIT_COUNTER.get(todayKey)) || 0;
    const totalCount = parseInt(await env.VISIT_COUNTER.get("total")) || 0;

    // --- 3) AKTUALIZACE ---
    await env.VISIT_COUNTER.put(todayKey, (todayCount + 1).toString());
    await env.VISIT_COUNTER.put("total", (totalCount + 1).toString());

    return new Response(
        JSON.stringify({ ok: true }),
        { headers: { "Content-Type": "application/json" } }
    );
}
