// Turns the single file build into the page body the Artifact host expects: title and styles
// first, no html/head/body tags of our own (the host adds the skeleton).
import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync(new URL("../dist-artifact/index.html", import.meta.url), "utf8");
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
const scripts = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
const page = `<title>Pen NPI Agent</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${styles}</style>
<div id="root"></div>
<script type="module">${scripts.replace(/<\/script/gi, "<\\/script")}</script>
`;
writeFileSync(new URL("../../../pen-npi-agent.html", import.meta.url), page);
console.log(`pen-npi-agent.html ${(page.length / 1024).toFixed(0)} KB`);
