export async function onRequestGet(context) {
    const { env } = context;

    const result = {
        today: { mobile: 0, desktop: 0, unknown: 0 },
        total: { mobile: 0, desktop: 0, unknown: 0 }
    };

    const todayKey = new Date().toISOString().slice(0, 10);

    // Stránkování – KV list vrací max 1000 klíčů najednou
    let cursor = undefined;
    do {
        const listResult = await env.VISIT_LOGS.list({
            prefix: "visit:",
            cursor,
            limit: 1000
        });

        for (const item of listResult.keys) {
            const raw = await env.VISIT_LOGS.get(item.name);
            if (!raw) continue;

            let entry;
            try {
                entry = JSON.parse(raw);
            } catch {
                continue;
            }

            const type = ["mobile", "desktop"].includes(entry.deviceType)
                ? entry.deviceType
                : "unknown";

            const date = new Date(entry.timestamp).toISOString().slice(0, 10);

            result.total[type]++;
            if (date === todayKey) result.today[type]++;
        }

        cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    return new Response(
        JSON.stringify(result),
        {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}
