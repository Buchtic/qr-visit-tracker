export async function onRequestGet(context) {
    const { env } = context;

    const todayKey = new Date().toISOString().slice(0, 10);

    const today = parseInt(await env.VISIT_COUNTER.get(todayKey) || "0");
    const total = parseInt(await env.VISIT_COUNTER.get("total") || "0");

    // Sestavit pole denních statistik pro grafy
    // Projdeme posledních 30 dní
    const stats = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().slice(0, 10);
        const count = parseInt(await env.VISIT_COUNTER.get(key) || "0");
        stats.push({ day: key, count });
    }

    return new Response(
        JSON.stringify({ today, total, stats }),
        {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}
