// Assemble la page publiable : injecte le fond de carte, les noms de pays, le commerce et les votes de chaque pays choisi dans src/template.html
// Usage : npm run build  ->  dist/index.html
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const isoc = require("i18n-iso-countries");
const topo = fs.readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8");
// Pays proposés dans le sélecteur, dans l'ordre du critère du top 10 (voir README) ; le = forme avec article, du = complément
const FOCUS = {
  FRA: { nom: "France", le: "la France", du: "de la France", cap: [2.35, 48.86], ue: true },
  USA: { nom: "États-Unis", le: "les États-Unis", du: "des États-Unis", cap: [-77.04, 38.91] },
  CHN: { nom: "Chine", le: "la Chine", du: "de la Chine", cap: [116.4, 39.9] },
  RUS: { nom: "Russie", le: "la Russie", du: "de la Russie", cap: [37.62, 55.75] },
  DEU: { nom: "Allemagne", le: "l'Allemagne", du: "de l'Allemagne", cap: [13.4, 52.52], ue: true },
  IND: { nom: "Inde", le: "l'Inde", du: "de l'Inde", cap: [77.21, 28.61] },
  GBR: { nom: "Royaume-Uni", le: "le Royaume-Uni", du: "du Royaume-Uni", cap: [-0.13, 51.51] },
  JPN: { nom: "Japon", le: "le Japon", du: "du Japon", cap: [139.69, 35.69] },
  ITA: { nom: "Italie", le: "l'Italie", du: "de l'Italie", cap: [12.5, 41.9], ue: true },
  CAN: { nom: "Canada", le: "le Canada", du: "du Canada", cap: [-75.7, 45.42] },
  KOR: { nom: "Corée du Sud", le: "la Corée du Sud", du: "de la Corée du Sud", cap: [126.98, 37.57] },
  SAU: { nom: "Arabie saoudite", le: "l'Arabie saoudite", du: "de l'Arabie saoudite", cap: [46.72, 24.71] },
};
// Les clés de world-atlas sont des codes ISO numériques sur 3 chiffres ("044")
const pad = values => Object.fromEntries(Object.entries(values).map(([k, v]) => [k.padStart(3, "0"), v]));
for (const [iso, f] of Object.entries(FOCUS)) {
  const votes = JSON.parse(read(`data/votes/votes-${iso.toLowerCase()}.json`));
  const trade = JSON.parse(read(`data/trade/trade-${iso.toLowerCase()}.json`));
  f.num = isoc.alpha3ToNumeric(iso);
  f.votes = pad(votes.values);
  f.trade = { ...trade, values: pad(trade.values) };
}

const html = read("src/template.html")
  .replace("__TOPO__", topo)
  .replace("__NAMES__", read("data/names.json"))
  .replace("__FOCUS__", JSON.stringify(FOCUS));

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
