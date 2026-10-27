// Renders the start page from the built server bundle and saves it as www/index.html
import { writeFileSync } from "node:fs";
const mod = await import(new URL("../dist/server/index.mjs", import.meta.url));
const worker = mod.default;
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const res = await worker.fetch(new Request("https://localhost/"), env, { waitUntil() {}, passThroughOnException() {} });
const html = await res.text();
if (!res.ok || !html.includes("<html")) { console.error("Render failed", res.status, html.slice(0, 300)); process.exit(1); }
writeFileSync(new URL("../www/index.html", import.meta.url), html);
console.log("✔ www/index.html written");
