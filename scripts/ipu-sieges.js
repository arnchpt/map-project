// Sièges par parti à la dernière élection de chaque chambre basse, API de l'Union interparlementaire (IPU Parline, sans clé).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/ipu-sieges.js   (la variable n'est utile que derrière un proxy)
// Écrit data/politique/ipu-sieges.json et tmp/rapport-ipu.md ; changed=true|false pour GitHub Actions.
// Licence IPU : CC BY-NC-SA 4.0 (usage non commercial, attribution, partage dans les mêmes conditions).
// Le build n'utilise ces sièges que si le code d'élection correspond à chambre.ipu dans politique.json :
// une nouvelle élection ne s'affiche qu'après mise à jour manuelle de la liste des partis (PR à relire).
const fs = require("fs");
const path = require("path");
const isoc = require("i18n-iso-countries");
const { touch } = require("./freshness");
const root = path.join(__dirname, "..");
const API = "https://api.data.ipu.org/v1";
const OUT = path.join(root, "data/politique/ipu-sieges.json");
const pol = JSON.parse(fs.readFileSync(path.join(root, "data/politique/politique.json"), "utf8"));
const get = async u => { const r = await fetch(u, { headers: { Accept: "application/json" } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };

(async () => {
  const snap = {};
  for (const iso of Object.keys(pol.pays)) {
    const ch = `${isoc.alpha3ToAlpha2(iso)}-LC01`;
    const last = (await get(`${API}/chambers/${ch}`)).data.attributes.last_election?.value?.from;
    if (!last) throw new Error(`${ch} : pas de dernière élection dans la réponse`);
    const code = `${ch}-E${last.slice(0, 10).replaceAll("-", "")}`;
    const a = (await get(`${API}/elections/${code}`)).data.attributes;
    const partis = Object.fromEntries((a.seats_per_parties?.value ?? []).map(p => [p.party, +p.total_number_of_seats]));
    snap[iso] = { code, date: last.slice(0, 10), sieges: a.number_of_seats_at_stake?.value ?? null, partis };
  }
  const txt = JSON.stringify(snap, null, 1) + "\n";
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const changed = !fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== txt;
  fs.writeFileSync(OUT, txt);

  const lines = [];
  for (const [iso, s] of Object.entries(snap)) {
    const c = pol.pays[iso].chambre, o = old[iso];
    if (o && o.code !== s.code) lines.push(`- **${iso}** : nouvelle élection ${s.code} (avant ${o.code}). Mettre à jour politique.json (partis, dirigeants, rôles, codes ipu) ; d'ici là le site garde l'ancienne répartition.`);
    else if (o && JSON.stringify(o.partis) !== JSON.stringify(s.partis)) lines.push(`- **${iso}** : sièges modifiés par l'IPU pour ${s.code}.`);
    if (c && c.ipu === s.code && Object.keys(s.partis).length) {
      const mapped = new Set(pol.pays[iso].partis.flatMap(p => p.ipu ?? []));
      const libres = Object.keys(s.partis).filter(k => !mapped.has(k) && s.partis[k] >= 5);
      if (libres.length) lines.push(`- **${iso}** : partis IPU d'au moins 5 sièges comptés dans « autres » : ${libres.join(", ")}`);
    }
    if (c && c.ipu !== s.code && Object.keys(s.partis).length) lines.push(`- **${iso}** : l'IPU publie ${s.code}, politique.json pointe ${c.ipu ?? "aucun code"}.`);
  }
  fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
  fs.writeFileSync(path.join(root, "tmp/rapport-ipu.md"), lines.join("\n") || "Aucun changement IPU.");
  touch("politique", { changed });
  console.log(changed ? "IPU a changé" : "IPU inchangé", `· ${lines.length} point(s) à relire`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
})().catch(e => { console.error(e.message); process.exit(1); });
