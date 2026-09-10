// functions/kampan/[[slug]].js
// Servíruje kampan/index.html pro libovolný slug
// URL v browseru zůstane /kampan/zjxnq2s1, JS přečte slug přes location.pathname

export async function onRequest(context) {
    // Načíst statický asset kampan/index.html přes env.ASSETS
    const url = new URL(context.request.url);
    url.pathname = "/kampan/index.html";
    
    const request = new Request(url.toString(), context.request);
    return context.env.ASSETS.fetch(request);
}
