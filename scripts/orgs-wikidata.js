// Compare les listes d'organisations validées (data/orgs.json) avec Wikidata, sans jamais les modifier.
// Usage : node scripts/orgs-wikidata.js
// Écrit data/check/orgs-wikidata.json (membres actuels selon Wikidata : propriété P463 « membre de », sans date de fin,
// pays ayant un code ISO numérique P299) et tmp/rapport-organisations.md (écarts avec notre liste).
// Wikidata sert de détecteur, pas de source : un écart signale une adhésion ou un retrait à vérifier sur le site officiel.
// Le fichier instantané ne change que si Wikidata change, et le workflow ouvre alors une PR pour relecture.
const fs = require("fs");
const path = require("path");
const { touch } = require("./freshness");
const root = path.join(__dirname, "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
// Membres enregistrés sur Wikidata sous un élément qui n'a pas de code ISO propre (le code est porté par le royaume)
const ALIAS = { Q55: "528", Q756617: "208" }; // Pays-Bas, Royaume de Danemark
const UA = "map-project/1.0 (https://github.com/arnchpt/map-project)";

(async () => {
  const { orgs } = read("data/orgs.json"), names = read("data/names.json");
  const qids = Object.fromEntries(Object.entries(orgs).filter(([, o]) => o.wikidata).map(([k, o]) => [o.wikidata, k]));
  const query = `SELECT ?org ?num WHERE {
    VALUES ?org { ${Object.keys(qids).map(q => "wd:" + q).join(" ")} }
    ?c p:P463 ?st . ?st ps:P463 ?org ; wikibase:rank ?rank .
    FILTER(?rank != wikibase:DeprecatedRank)
    FILTER NOT EXISTS { ?st pq:P582 ?fin }
    { ?c wdt:P299 ?num } UNION { VALUES (?c ?num) { ${Object.entries(ALIAS).map(([q, n]) => `(wd:${q} "${n}")`).join(" ")} } }
  }`;
  const r = await fetch("https://query.wikidata.org/sparql?query=" + encodeURIComponent(query), { headers: { Accept: "application/sparql-results+json", "User-Agent": UA } });
  if (!r.ok) throw new Error(`Wikidata ${r.status}`);
  const wd = Object.fromEntries(Object.values(qids).map(k => [k, new Set()]));
  for (const b of (await r.json()).results.bindings) wd[qids[b.org.value.split("/").pop()]].add(b.num.value.padStart(3, "0"));
  const snap = Object.fromEntries(Object.entries(wd).map(([k, s]) => [k, [...s].sort()]));
  if (Object.values(snap).some(s => !s.length)) throw new Error("organisation sans aucun membre dans la réponse : requête ou identifiant à revoir");

  const out = path.join(root, "data/check/orgs-wikidata.json"), txt = JSON.stringify(snap, null, 1) + "\n";
  const changed = !fs.existsSync(out) || fs.readFileSync(out, "utf8") !== txt;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, txt);

  const nom = n => `${names[n] ?? names[String(+n)] ?? "?"} (${n})`;
  const lines = [];
  for (const [k, members] of Object.entries(snap)) {
    const ours = new Set(orgs[k].membres), plus = members.filter(n => !ours.has(n)), moins = orgs[k].membres.filter(n => !members.includes(n));
    if (plus.length || moins.length) lines.push(`- **${k}** : ${[plus.length && `selon Wikidata seulement : ${plus.map(nom).join(", ")}`, moins.length && `notre liste seulement : ${moins.map(nom).join(", ")}`].filter(Boolean).join(" ; ")}`);
  }
  fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
  fs.writeFileSync(path.join(root, "tmp/rapport-organisations.md"), lines.join("\n") || "Aucun écart avec Wikidata.");
  touch("organisations", { changed: false });
  console.log(changed ? "Wikidata a changé" : "Wikidata inchangé", `· ${lines.length} organisation(s) avec écart`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
})().catch(e => { console.error(e.message); process.exit(1); });
