// Assemble la page publiable : injecte le fond de carte, les noms de pays, le commerce, les votes et les plafonds sanctions de chaque pays choisi,
// les organisations (data/orgs.json), les forces politiques (data/politique/politique.json) et la fraîcheur des couches (data/freshness.json) dans src/template.html
// Usage : npm run build  ->  dist/index.html
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const isoc = require("i18n-iso-countries");
const topo = fs.readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8");
// Pays proposés dans le sélecteur, France d’abord, puis le top 10 retenu, puis les autres membres de l'UE (voir README) ; le = forme avec article, du = complément
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
  // Autres États membres de l'UE (extension du 26/10/2026)
  AUT: { nom: "Autriche", le: "l'Autriche", du: "de l'Autriche", cap: [16.37, 48.21], ue: true },
  BEL: { nom: "Belgique", le: "la Belgique", du: "de la Belgique", cap: [4.35, 50.85], ue: true },
  BGR: { nom: "Bulgarie", le: "la Bulgarie", du: "de la Bulgarie", cap: [23.32, 42.7], ue: true },
  CYP: { nom: "Chypre", le: "Chypre", du: "de Chypre", cap: [33.37, 35.17], ue: true },
  HRV: { nom: "Croatie", le: "la Croatie", du: "de la Croatie", cap: [15.98, 45.81], ue: true },
  DNK: { nom: "Danemark", le: "le Danemark", du: "du Danemark", cap: [12.57, 55.68], ue: true },
  ESP: { nom: "Espagne", le: "l'Espagne", du: "de l'Espagne", cap: [-3.7, 40.42], ue: true },
  EST: { nom: "Estonie", le: "l'Estonie", du: "de l'Estonie", cap: [24.75, 59.44], ue: true },
  FIN: { nom: "Finlande", le: "la Finlande", du: "de la Finlande", cap: [24.94, 60.17], ue: true },
  GRC: { nom: "Grèce", le: "la Grèce", du: "de la Grèce", cap: [23.73, 37.98], ue: true },
  HUN: { nom: "Hongrie", le: "la Hongrie", du: "de la Hongrie", cap: [19.04, 47.5], ue: true },
  IRL: { nom: "Irlande", le: "l'Irlande", du: "de l'Irlande", cap: [-6.26, 53.35], ue: true },
  LVA: { nom: "Lettonie", le: "la Lettonie", du: "de la Lettonie", cap: [24.11, 56.95], ue: true },
  LTU: { nom: "Lituanie", le: "la Lituanie", du: "de la Lituanie", cap: [25.28, 54.69], ue: true },
  LUX: { nom: "Luxembourg", le: "le Luxembourg", du: "du Luxembourg", cap: [6.13, 49.61], ue: true },
  MLT: { nom: "Malte", le: "Malte", du: "de Malte", cap: [14.51, 35.9], ue: true },
  NLD: { nom: "Pays-Bas", le: "les Pays-Bas", du: "des Pays-Bas", cap: [4.9, 52.37], ue: true },
  POL: { nom: "Pologne", le: "la Pologne", du: "de la Pologne", cap: [21.01, 52.23], ue: true },
  PRT: { nom: "Portugal", le: "le Portugal", du: "du Portugal", cap: [-9.14, 38.72], ue: true },
  CZE: { nom: "Tchéquie", le: "la Tchéquie", du: "de la Tchéquie", cap: [14.42, 50.09], ue: true },
  ROU: { nom: "Roumanie", le: "la Roumanie", du: "de la Roumanie", cap: [26.1, 44.43], ue: true },
  SVK: { nom: "Slovaquie", le: "la Slovaquie", du: "de la Slovaquie", cap: [17.11, 48.15], ue: true },
  SVN: { nom: "Slovénie", le: "la Slovénie", du: "de la Slovénie", cap: [14.51, 46.06], ue: true },
  SWE: { nom: "Suède", le: "la Suède", du: "de la Suède", cap: [18.07, 59.33], ue: true },
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

// Données nationales (data/pays/<iso3>/, contrat dans data/pays/README.md) : présences, conflits et tensions, sources.
// La France garde pour l'instant ses faits du gabarit (relevés et vérifiés sur defense.gouv.fr).
// nv = la source n'a pas pu être lue depuis la session (domaine bloqué) : le fait s'affiche avec la mention « non vérifié ».
// Le Kosovo n'a pas de code numérique dans le fond de carte : son tracé y est repéré par son nom
const numOf = iso => iso == null ? null : iso === "XKX" ? "Kosovo" : isoc.alpha3ToNumeric(iso);
const readPays = (iso, f) => { const p = path.join(root, "data/pays", iso.toLowerCase(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
for (const [iso, f] of Object.entries(FOCUS)) {
  const s = readPays(iso, "sources.json");
  if (!s || iso === "FRA") continue;
  const src = Object.fromEntries(s.sources.map(x => [x.id, { t: x.nom, u: x.url, nv: x.acces !== "verifie" }]));
  const nv = id => src[id]?.nv ?? true;
  const p = readPays(iso, "presences.json"), c = readPays(iso, "conflits.json");
  f.nat = {
    verifie: p.verifie,
    src,
    pres: p.presences.map(x => ({ id: numOf(x.hote), lon: x.lon, lat: x.lat, nom: x.nom, cat: x.cat, eff: x.eff, depuis: x.depuis, s: x.src, nv: nv(x.src) })),
    unplaced: (p.non_localisees ?? []).map(x => ({ nom: x.nom, eff: x.eff ?? "n.c.", s: x.src, nv: nv(x.src) })),
    events: c.evenements.map(x => ({ id: numOf(x.avec), k: x.k, t: x.t, d: x.d, date: x.date, s: x.src, nv: nv(x.src) })),
  };
}

// Plafond sanctions de chaque paire (règle dans data/sanctions.json) : 40 si une mesure compte dans un sens, 20 dans les deux
const SANC = JSON.parse(read("data/sanctions.json"));
const NAMES = JSON.parse(read("data/names.json"));
const arr = v => Array.isArray(v) ? v : [v];
const members = t => t === "UE" ? SANC.ue : [t];
const label = t => t === "UE" ? "UE" : FOCUS[t]?.nom || NAMES[isoc.alpha3ToNumeric(t)] || isoc.getName(t, "fr") || t;
const EDGES = SANC.mesures.flatMap(m => arr(m.de).flatMap(a => arr(m.vers).flatMap(b =>
  members(a).flatMap(x => members(b).map(y => ({ de: x, vers: y, d: `${label(a)} → ${label(b)} : ${m.d}`, src: m.src }))))));
for (const [iso, f] of Object.entries(FOCUS)) {
  const pairs = {};
  for (const e of EDGES) {
    const other = e.de === iso ? e.vers : e.vers === iso ? e.de : null;
    if (!other) continue;
    const p = pairs[other] ??= { out: false, in: false, m: [] };
    p[e.de === iso ? "out" : "in"] = true;
    if (!p.m.some(x => x.d === e.d)) p.m.push({ d: e.d, src: e.src });
  }
  f.sanctions = Object.fromEntries(Object.entries(pairs).map(([o, p]) => [isoc.alpha3ToNumeric(o), { plafond: p.out && p.in ? 20 : 40, d: p.m.map(x => x.d).join(" ; "), m: p.m }]));
}

// Couche conflits des membres de l'UE : les sanctions de l'UE (même liste que la France) s'ajoutent aux faits nationaux
for (const [iso, f] of Object.entries(FOCUS)) if (f.nat && f.ue)
  for (const [id, x] of Object.entries(f.sanctions)) if (x.m.some(m => m.d.startsWith("UE →")))
    f.nat.events.push({ id, k: "sanction", t: "Sanctions de l'UE", d: "Régime de mesures restrictives de l'UE, appliqué par chaque État membre.", s: "sanc" });

// Forces politiques : les sièges viennent de l'IPU (scripts/ipu-sieges.js) quand l'élection relevée est celle que pointe chambre.ipu
// et que chaque parti listé a sa correspondance IPU ; sinon (nouvelle élection pas encore relue, Italie, Russie) les chiffres du JSON restent
function politique() {
  const pol = JSON.parse(read("data/politique/politique.json")), ipu = JSON.parse(read("data/politique/ipu-sieges.json"));
  // Pays de l'UE sans entrée dans politique.json : relevé du fil pays (data/pays/<iso3>/politique.json), mêmes champs
  for (const iso of Object.keys(FOCUS)) if (!pol.pays[iso]) {
    const g = readPays(iso, "politique.json");
    if (!g) continue;
    const { pays, verifie, ...rest } = g, srcs = readPays(iso, "sources.json")?.sources ?? [];
    const ref = id => { const x = srcs.find(x => x.id === id); return x && { t: x.nom + (x.acces !== "verifie" ? " (non vérifié)" : ""), u: x.url }; };
    if (rest.chambre) rest.chambre.src = ref(rest.chambre.src) ?? { t: "source non renseignée", u: "#" };
    pol.pays[iso] = rest;
  }
  for (const [iso, p] of Object.entries(pol.pays)) {
    const s = ipu[iso], c = p.chambre;
    if (!c || !s || s.code !== c.ipu || !Object.keys(s.partis).length || !p.partis.every(x => x.ipu)) continue;
    for (const x of p.partis) x.sieges = x.ipu.reduce((t, k) => t + (s.partis[k] ?? 0), 0);
    c.sieges = s.sieges;
    p.autres = s.sieges - p.partis.reduce((t, x) => t + x.sieges, 0);
  }
  return pol;
}

const html = read("src/template.html")
  .replace("__TOPO__", topo)
  .replace("__NAMES__", read("data/names.json"))
  .replace("__FOCUS__", JSON.stringify(FOCUS))
  .replace("__ORGS__", JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(read("data/orgs.json")).orgs).map(([k, o]) => [k, o.membres]))))
  .replace("__FRESH__", read("data/freshness.json"))
  .replace("__POLITIQUE__", JSON.stringify(politique()));

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
