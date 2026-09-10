// functions/kampan/[[slug]].js
// CF Pages Function — servíruje kampan/index.html pro libovolný slug
// URL v browseru zůstane /kampan/jl2vk4oh, JS přečte slug přes location.pathname

export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.pathname = "/kampan/index.html";
    return fetch(url.toString(), context.request);
}
