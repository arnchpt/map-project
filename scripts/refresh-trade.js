// Actualise data/trade/trade-<pays>.json depuis le FMI (IMTS) pour chaque pays focus, puis contrôle les nouveaux chiffres.
// Usage : NODE_USE_ENV_PROXY=1 node scripts/refresh-trade.js   (la variable n'est utile que derrière un proxy)
// Année visée : l'année civile précédente si le FMI la publie déjà, sinon on garde l'année du fichier en place.
// Contrôles (une anomalie n'empêche pas d'écrire le fichier, mais le workflow ouvre alors une PR au lieu de publier) :
//   - total monde absent, ou nombre de partenaires en baisse de plus de 10 %
//   - total monde (exportations ou importations) qui bouge de plus de 30 %
//   - l'un des 10 premiers partenaires qui bouge de plus de 50 % (au moins 1 Md$ d'écart)
//   - changement d'année : toujours relu par un humain (libellés et notes de la page à revoir)
// Sorties : anomalies dans tmp/anomalies-commerce.md, et changed=/anomaly= dans $GITHUB_OUTPUT quand il existe.
const fs = require("fs");
const path = require("path");
const { fetchTrade } = require("./imts");
const { touch } = require("./freshness");
const root = path.join(__dirname, "..");
const dir = path.join(root, "data/trade");
const names = JSON.parse(fs.readFileSync(path.join(root, "data/names.json"), "utf8"));
const nom = k => `${names[k] ?? names[k.padStart(3, "0")] ?? "?"} (${k})`;

const pct = (a, b) => (b ? Math.abs(a - b) / Math.abs(b) : a ? Infinity : 0);
const top10 = v => Object.keys(v).filter(k => v[k].x != null && v[k].m != null).sort((a, b) => (v[b].x + v[b].m) - (v[a].x + v[a].m)).slice(0, 10);

function check(iso, old, neu) {
  const a = [];
  if (neu.monde.x == null || neu.monde.m == null) a.push(`${iso} : total monde absent`);
  const n0 = Object.keys(old.values).length, n1 = Object.keys(neu.values).length;
  if (n1 < n0 * 0.9) a.push(`${iso} : ${n1} partenaires contre ${n0} avant`);
  if (neu.annee !== old.annee) {
    a.push(`${iso} : passage de ${old.annee} à ${neu.annee} (libellés et notes de la page à relire)`);
    return a; // les écarts entre deux années ne sont pas des anomalies
  }
  for (const f of ["x", "m"]) if (pct(neu.monde[f], old.monde[f]) > 0.3) a.push(`${iso} : total monde ${f === "x" ? "exportations" : "importations"} ${old.monde[f]} → ${neu.monde[f]} Md$`);
  for (const k of top10(old.values)) for (const f of ["x", "m"]) {
    const o = old.values[k][f], v = neu.values[k]?.[f];
    if (v == null) a.push(`${iso} : partenaire ${nom(k)} disparu`);
    else if (pct(v, o) > 0.5 && Math.abs(v - o) >= 1) a.push(`${iso} : partenaire ${nom(k)}, ${f === "x" ? "exportations" : "importations"} ${o} → ${v} Md$`);
  }
  return a;
}

(async () => {
  const files = fs.readdirSync(dir).filter(f => /^trade-[a-z]{3}\.json$/.test(f)).sort();
  const target = new Date().getUTCFullYear() - 1, anomalies = [], errors = [];
  let changed = 0, year;
  for (const file of files) {
    const iso = file.slice(6, 9).toUpperCase(), p = path.join(dir, file), old = JSON.parse(fs.readFileSync(p, "utf8"));
    let neu;
    for (const y of [...new Set([target, old.annee])].filter(y => y >= old.annee)) {
      try { neu = await fetchTrade(iso, y); break; }
      catch (e) { if (!/absente/.test(e.message)) { errors.push(`${iso} : ${e.message}`); break; } }
    }
    if (!neu) { if (!errors.some(e => e.startsWith(iso))) errors.push(`${iso} : aucune année exploitable`); continue; }
    year = Math.max(year ?? 0, neu.annee);
    const txt = JSON.stringify(neu);
    if (txt === fs.readFileSync(p, "utf8")) continue;
    anomalies.push(...check(iso, old, neu));
    fs.writeFileSync(p, txt);
    changed++;
  }
  console.log(`${changed} fichier(s) modifié(s), ${anomalies.length} anomalie(s), ${errors.length} erreur(s)`);
  // Pas de mise à jour de fraîcheur si une source a échoué : la date de vérification doit rester honnête
  if (!errors.length) touch("commerce", { changed: changed > 0, donnees: year && String(year) });
  fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
  fs.writeFileSync(path.join(root, "tmp/anomalies-commerce.md"), anomalies.map(a => `- ${a}`).join("\n"));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed > 0}\nanomaly=${anomalies.length > 0}\n`);
  anomalies.forEach(a => console.log("ANOMALIE", a));
  if (errors.length) { errors.forEach(e => console.error("ERREUR", e)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
