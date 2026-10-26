// Contrôle des chefs d'État et de gouvernement de data/politique/politique.json contre Wikidata (P35, P6 sans date de fin).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/politique.js   (la variable n'est utile que derrière un proxy)
// Sortie : tmp/rapport-politique.md (écarts à vérifier puis reporter à la main dans le JSON) et ecart=true|false pour GitHub Actions.
// Comme pour les organisations, Wikidata n'est qu'un détecteur : rien n'est réécrit automatiquement.
// Sièges et dirigeants de partis ne sont pas contrôlés : Wikidata est incomplet sur ces deux points (voir README).
const fs = require("fs");
const path = require("path");
const { touch } = require("./freshness");
const root = path.join(__dirname, "..");
const data = require(path.join(__dirname, "../data/politique/politique.json"));
const isos = Object.keys(data.pays);
const query = `SELECT ?iso ?prop ?p ?pLabel WHERE {
  VALUES ?iso { ${isos.map(i => `"${i}"`).join(" ")} }
  VALUES (?prop ?pp ?ps) { ("P35" p:P35 ps:P35) ("P6" p:P6 ps:P6) }
  ?c wdt:P298 ?iso ; ?pp ?st . ?st ?ps ?p ; wikibase:rank ?rk .
  FILTER NOT EXISTS { ?st pq:P582 [] } FILTER(?rk != wikibase:DeprecatedRank)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`;

(async () => {
  const r = await fetch("https://query.wikidata.org/sparql?query=" + encodeURIComponent(query), {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "map-project (https://github.com/arnchpt/map-project)" } });
  if (!r.ok) throw new Error(`Wikidata ${r.status}`);
  const rows = (await r.json()).results.bindings.map(b => ({ iso: b.iso.value, prop: b.prop.value, qid: b.p.value.split("/").pop(), nom: b.pLabel.value }));
  const ecarts = [];
  for (const iso of isos) {
    const p = data.pays[iso];
    const attendu = { P35: [p.chef_etat?.qid], P6: [p.chef_gouv?.qid] };
    // Régime présidentiel : le président est aussi chef du gouvernement (États-Unis, Corée du Sud)
    if (/chef de l'État et du gouvernement/.test(p.chef_etat?.fonction ?? "")) attendu.P6.push(p.chef_etat.qid);
    for (const prop of ["P35", "P6"]) {
      const wd = rows.filter(x => x.iso === iso && x.prop === prop);
      for (const x of wd) if (!attendu[prop].includes(x.qid)) ecarts.push(`${iso} ${prop} : Wikidata indique ${x.nom} (${x.qid}), absent du JSON`);
      for (const q of attendu[prop].filter(Boolean)) if (!wd.some(x => x.qid === q)) ecarts.push(`${iso} ${prop} : ${q} n'est plus en fonction selon Wikidata`);
    }
  }
  fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
  fs.writeFileSync(path.join(root, "tmp/rapport-politique.md"), ecarts.map(e => `- ${e}`).join("\n") || "Aucun écart avec Wikidata.");
  if (!ecarts.length) touch("politique", { changed: false });
  console.log(ecarts.length ? ecarts.join("\n") : `Aucun écart (${isos.length} pays)`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ecart=${ecarts.length > 0}\n`);
})().catch(e => { console.error(e.message); process.exit(1); });
