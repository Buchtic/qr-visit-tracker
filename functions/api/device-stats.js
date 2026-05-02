export async function onRequestGet(context) {
    const { env } = context;

    // Výsledná struktura
    const result = {
        today: {
            mobile: 0,
            desktop: 0,
            unknown: 0
        },
        total: {
            mobile: 0,
            desktop: 0,
            unknown: 0
        }
    };

    // Dnešní datum ve formátu YYYY-MM-DD
    const todayKey = new Date().toISOString().slice(0, 10);

    // Všechny klíče z VISIT_LOGS
    const list = await env.VISIT_LOGS.list();

    for (const item of list.keys) {
        const raw = await env.VISIT_LOGS.get(item.name);
        if (!raw) continue;

        let entry;
        try {
            entry = JSON.parse(raw);
        } catch {
            continue;
        }

        const type = entry.deviceType || "unknown";
        const date = new Date(entry.timestamp).toISOString().slice(0, 10);

        // Celkové statistiky
        if (result.total[type] !== undefined) {
            result.total[type]++;
        } else {
            result.total.unknown++;
        }

        // Dnešní statistiky
        if (date === todayKey) {
            if (result.today[type] !== undefined) {
                result.today[type]++;
            } else {
                result.today.unknown++;
            }
        }
    }

    return new Response(
        JSON.stringify(result),
        { headers: { "Content-Type": "application/json" } }
    );
}
