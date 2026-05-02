/*export async function onRequestGet(context) {
    const env = context.env;

    const list = await env.DB.list({ prefix: "day:" });

    const stats = [];

    for (const key of list.keys) {
        const day = key.name.replace("day:", "");
        const count = parseInt(await env.DB.get(key.name) || "0");
        stats.push({ day, count });
    }

    stats.sort((a, b) => a.day.localeCompare(b.day));

    const total = parseInt(await env.DB.get("total") || "0");

    return new Response(JSON.stringify({ total, stats }), {
        headers: { "Content-Type": "application/json" }
    });
}*/


export async function onRequestGet(context) {
    const { env } = context;

    const todayKey = new Date().toISOString().slice(0, 10);

    const today = parseInt(await env.VISIT_COUNTER.get(todayKey)) || 0;
    const total = parseInt(await env.VISIT_COUNTER.get("total")) || 0;

    return new Response(
        JSON.stringify({ today, total }),
        { headers: { "Content-Type": "application/json" } }
    );
}
