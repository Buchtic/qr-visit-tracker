export async function onRequestGet(context) {
    const { env, request } = context;

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("from");  // YYYY-MM-DD
    const dateTo   = url.searchParams.get("to");    // YYYY-MM-DD
    const cursor   = url.searchParams.get("cursor") || undefined;
    const limit    = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    // Timestamp hranice pro filtr
    const tsFrom = dateFrom ? new Date(dateFrom + "T00:00:00Z").getTime() : 0;
    const tsTo   = dateTo   ? new Date(dateTo   + "T23:59:59Z").getTime() : Infinity;

    const entries = [];
    let nextCursor = null;
    let listCursor = cursor;
    let scanned = 0;
    const MAX_SCAN = 2000; // pojistka proti timeout

    do {
        const listResult = await env.VISIT_LOGS.list({
            prefix: "visit:",
            cursor: listCursor,
            limit: 1000
        });

        for (const item of listResult.keys) {
            scanned++;

            // Klíč: visit:TIMESTAMP:fingerprint8
            const parts = item.name.split(":");
            const ts = parseInt(parts[1] || "0");

            if (ts < tsFrom || ts > tsTo) continue;

            const raw = await env.VISIT_LOGS.get(item.name);
            if (!raw) continue;

            let entry;
            try { entry = JSON.parse(raw); } catch { continue; }

            entries.push({
                key: item.name,
                timestamp: entry.timestamp,
                deviceType: entry.deviceType || "unknown",
                os: entry.os || "unknown",
                isBot: entry.isBot || false,
                fingerprint: entry.fingerprint
                    ? entry.fingerprint.slice(0, 16) + "…"
                    : "–",
                raw: entry
            });

            if (entries.length >= limit) {
                // Uložit cursor pro další stránku
                nextCursor = listResult.list_complete ? null : listResult.cursor;
                break;
            }
        }

        if (entries.length >= limit || scanned >= MAX_SCAN) break;

        listCursor = listResult.list_complete ? null : listResult.cursor;
    } while (listCursor);

    // Seřadit od nejnovějšího
    entries.sort((a, b) => b.timestamp - a.timestamp);

    return new Response(
        JSON.stringify({ entries, nextCursor, total: entries.length }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}
