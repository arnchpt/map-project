// Assemble la page publiable : injecte le fond de carte, les noms de pays et les scores de vote dans src/template.html
// Usage : npm run build  ->  dist/index.html
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const topo = fs.readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8");
const votes = JSON.parse(read("data/votes-fra.json"));
// Les clés de world-atlas sont des codes ISO numériques sur 3 chiffres ("044")
const values = Object.fromEntries(Object.entries(votes.values).map(([k, v]) => [k.padStart(3, "0"), v]));

const html = read("src/template.html")
  .replace("__TOPO__", topo)
  .replace("__NAMES__", read("data/names.json"))
  .replace("__VOTES__", JSON.stringify({ sessions: votes.sessions, values }));

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), html);
console.log("dist/index.html", (html.length / 1024).toFixed(0), "Ko");

// Version GitHub Pages : même page, enveloppée dans un document complet (docs/index.html)
const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${html}
</body>
</html>
`;
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/index.html"), page);
console.log("docs/index.html (GitHub Pages)");
