export async function onRequestGet(context) {
    const { env, request } = context;

    // Admin endpoint — vyžaduje CF Access cookie nebo X-Admin-Token
    const cookie = request.headers.get("Cookie") || "";
    const cfJwt  = request.headers.get("CF-Access-Jwt-Assertion");
    const token  = request.headers.get("X-Admin-Token");
    const isAdmin = cfJwt || cookie.includes("CF_Authorization=") || (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const dateFrom   = url.searchParams.get("from");    // YYYY-MM-DD
    const dateTo     = url.searchParams.get("to");      // YYYY-MM-DD
    const cursor     = url.searchParams.get("cursor") || undefined;
    const limit      = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    // Předefinované filtry
    const filterDevice   = url.searchParams.get("device");    // mobile | desktop | unknown
    const filterOs       = url.searchParams.get("os");        // android | ios | windows | mac | linux
    const filterBot      = url.searchParams.get("bot");       // "1" = jen boti, "0" = jen lidi
    const filterScan     = url.searchParams.get("scan");      // "1" = jen pravděpodobné QR skeny
    const filterUnique   = url.searchParams.get("unique");    // "1" = deduplikovat per fingerprint

    // Timestamp hranice
    const tsFrom = dateFrom ? new Date(dateFrom + "T00:00:00Z").getTime() : 0;
    const tsTo   = dateTo   ? new Date(dateTo   + "T23:59:59Z").getTime() : Infinity;

    const entries  = [];
    const seenFps  = new Set(); // pro deduplikaci
    let nextCursor = null;
    let listCursor = cursor;
    let scanned    = 0;
    const MAX_SCAN = 2000;

    do {
        const listResult = await env.VISIT_LOGS.list({
            prefix: "visit:",
            cursor: listCursor,
            limit: 1000
        });

        for (const item of listResult.keys) {
            scanned++;

            // Rychlý timestamp filtr z klíče (bez čtení hodnoty)
            const parts = item.name.split(":");
            const ts = parseInt(parts[1] || "0");
            if (ts < tsFrom || ts > tsTo) continue;

            const raw = await env.VISIT_LOGS.get(item.name);
            if (!raw) continue;

            let entry;
            try { entry = JSON.parse(raw); } catch { continue; }

            // --- Filtry ---
            if (filterDevice && entry.deviceType !== filterDevice) continue;
            if (filterOs     && entry.os !== filterOs)             continue;

            if (filterBot === "1" && !entry.isBot)  continue;
            if (filterBot === "0" &&  entry.isBot)  continue;

            if (filterScan === "1" && !entry.likelyScan) continue;

            // Deduplikace per fingerprint (zachová jen první záznam)
            if (filterUnique === "1") {
                const fp = entry.fingerprint || item.name;
                if (seenFps.has(fp)) continue;
                seenFps.add(fp);
            }

            entries.push({
                key:        item.name,
                timestamp:  entry.timestamp,
                deviceType: entry.deviceType  || "unknown",
                os:         entry.os          || "unknown",
                isBot:      entry.isBot       || false,
                likelyScan: entry.likelyScan  || false,
                country:    entry.country     || "",
                city:       entry.city        || "",
                asOrg:      entry.asOrg       || "",
                referrer:   entry.referrer    || "",
                fingerprint: entry.fingerprint
                    ? entry.fingerprint.slice(0, 16) + "…"
                    : "–",
                raw: entry
            });

            if (entries.length >= limit) {
                nextCursor = listResult.list_complete ? null : listResult.cursor;
                break;
            }
        }

        if (entries.length >= limit || scanned >= MAX_SCAN) break;
        listCursor = listResult.list_complete ? null : listResult.cursor;
    } while (listCursor);

    entries.sort((a, b) => b.timestamp - a.timestamp);

    return new Response(
        JSON.stringify({ entries, nextCursor, total: entries.length, scanned }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
}
