// Veille mensuelle des régimes de sanctions (UE, États-Unis, Royaume-Uni, Canada), sans jamais modifier data/sanctions.json.
// Usage : node scripts/veille-sanctions.js
// Télécharge la liste officielle de chaque autorité, en tire les régimes (programmes OFAC, régimes britanniques, pays visés
// par le Canada, programmes de l'UE) et le nombre de désignations de chacun, puis compare avec data/check/sanctions-regimes.json.
// Alerte (sortie changed=true, rapport tmp/rapport-sanctions.md) si un régime apparaît ou disparaît, si une mesure retenue
// dans data/sanctions.json n'a plus de régime correspondant, ou si un régime visant un pays plafonné varie de plus de 25 %.
// Le plafond reste une décision humaine : le rapport dit quoi vérifier, la PR ne fait que mettre à jour l'instantané.
// Une source injoignable ou illisible fait échouer le script (code 1) après le rapport : jamais de silence.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const UA = "map-project/1.0 (https://github.com/arnchpt/map-project)";
const SNAP = "data/check/sanctions-regimes.json";
const SEUIL = 0.25;

// Valeurs d'un élément XML <tag>…</tag>, une liste par fiche (fiche = texte entre deux balises `fiche`)
const xmlTags = (fiche, tag) => txt => txt.split(`<${fiche}`).slice(1).map(f => [...f.matchAll(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`, "g"))].map(m => m[1]));
const xmlAttrs = (fiche, attr) => txt => txt.split(`<${fiche}`).slice(1).map(f => [...f.matchAll(new RegExp(`\\s${attr}="([^"]+)"`, "g"))].map(m => m[1]));
// SDN.CSV de l'OFAC : sans en-tête, 4e colonne = programme(s), plusieurs séparés par « ] [ »
const ofacCsv = txt => txt.split(/\r?\n/).filter(Boolean).map(l => {
  const cols = [];
  l.replace(/\s*(?:"((?:[^"]|"")*)"|([^,]*))\s*(?:,|$)/g, (_, q, v) => (cols.push(q != null ? q.replace(/""/g, '"') : v), ""));
  return (cols[3] ?? "").split("] [").map(s => s.replace(/^\[|\]$/g, "").trim()).filter(p => p && p !== "-0-");
});

const SOURCES = {
  UE: {
    nom: "Commission européenne, liste consolidée des sanctions financières (FSF)",
    urls: ["https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw"],
    lire: xmlAttrs("sanctionEntity", "programme"), min: 15,
  },
  USA: {
    nom: "OFAC (Trésor américain), liste SDN",
    urls: ["https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV", "https://www.treasury.gov/ofac/downloads/sdn.csv"],
    lire: ofacCsv, min: 15,
  },
  GBR: {
    nom: "FCDO, UK Sanctions List",
    urls: ["https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml"],
    lire: xmlTags("Designation", "RegimeName"), min: 10,
  },
  CAN: {
    nom: "Affaires mondiales Canada, liste consolidée des sanctions autonomes (LMES)",
    urls: ["https://www.international.gc.ca/world-monde/assets/office_docs/international_relations-relations_internationales/sanctions/sema-lmes.xml"],
    lire: xmlTags("record", "Country-Pays"), min: 8,
  },
};

// Pays visé par un régime, d'après son nom ou son code. Sert à relier les régimes aux mesures de data/sanctions.json.
const CIBLES = [
  ["RUS", /RUSSIA|^RUS$/], ["BLR", /BELARUS|^BLR$/], ["IRN", /IRAN|^IRN$/], ["PRK", /NORTH KOREA|KOREA, NORTH|DPRK|DEMOCRATIC PEOPLE|^PRK$/],
  ["CUB", /CUBA|^CUB$/], ["VEN", /VENEZUELA|^VEN$/], ["NIC", /NICARAGUA|^NIC$/], ["MMR", /BURMA|MYANMAR|^MMR$/],
  ["SDN", /^(?!.*SOUTH).*SUDAN|^SDN$/], ["SYR", /SYRIA|^SYR$/], ["AFG", /AFGHANISTAN|TALIBAN|^AFG$/],
];
const cible = r => CIBLES.find(([, re]) => re.test(r.toUpperCase()))?.[0] ?? null;

async function telecharger(src) {
  const erreurs = [];
  for (const url of src.urls) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(180e3) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text(), regimes = {};
      for (const fiche of src.lire(txt)) for (const reg of new Set(fiche)) regimes[reg] = (regimes[reg] ?? 0) + 1;
      if (Object.keys(regimes).length < src.min) {
        // Format probablement changé : on montre ce que contient le fichier pour corriger l'extraction vite
        const tags = {};
        for (const m of txt.slice(0, 2e6).matchAll(/<([A-Za-z][\w:-]*)[\s>]/g)) tags[m[1]] = (tags[m[1]] ?? 0) + 1;
        throw new Error(`${Object.keys(regimes).length} régime(s) lu(s), ${src.min} attendus au moins. ${txt.length} caractères. Début : ${JSON.stringify(txt.slice(0, 300))}. Balises : ${Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([t, n]) => `${t}×${n}`).join(" ")}`);
      }
      return { url, regimes };
    } catch (e) { erreurs.push(`${url} : ${e.cause?.message ?? e.message}`); }
  }
  throw new Error(erreurs.join("\n  "));
}

(async () => {
  const { mesures } = read("data/sanctions.json");
  const ancien = fs.existsSync(path.join(root, SNAP)) ? read(SNAP) : {};
  const nouveau = { ...ancien }, lignes = [], echecs = [];
  // Mesures retenues par autorité suivie : { USA: Set(RUS, IRN…) }
  const retenues = {};
  for (const m of mesures) for (const de of [m.de].flat()) if (SOURCES[de]) for (const v of [m.vers].flat()) (retenues[de] ??= new Set()).add(v);

  for (const [k, src] of Object.entries(SOURCES)) {
    let res;
    try { res = await telecharger(src); } catch (e) { echecs.push(`${k} (${src.nom}) :\n  ${e.message}`); continue; }
    const avant = ancien[k]?.regimes, apres = res.regimes, alertes = [];
    const fmt = r => `${r}${cible(r) ? ` [${cible(r)}]` : ""}`;
    if (!avant) alertes.push(`Première relève : ${Object.keys(apres).length} régimes. Vérifier que la liste ci-dessous a du sens (extraction jamais testée avant ce passage) :\n\n  ${Object.entries(apres).sort().map(([r, n]) => `${fmt(r)} (${n})`).join(" · ")}`);
    else {
      const plus = Object.keys(apres).filter(r => !(r in avant)), moins = Object.keys(avant).filter(r => !(r in apres));
      if (plus.length) alertes.push(`Nouveau(x) régime(s) : ${plus.map(r => `${fmt(r)} (${apres[r]} désignations)`).join(", ")}`);
      if (moins.length) alertes.push(`Régime(s) disparu(s) : ${moins.map(fmt).join(", ")}`);
      for (const [r, n] of Object.entries(apres)) {
        const n0 = avant[r], c = cible(r);
        if (n0 && c && retenues[k]?.has(c) && Math.abs(n - n0) >= 10 && Math.abs(n - n0) / n0 > SEUIL)
          alertes.push(`${fmt(r)} : ${n0} → ${n} désignations (${n > n0 ? "+" : ""}${Math.round((n - n0) / n0 * 100)} %)`);
      }
    }
    // Mesures retenues sans régime correspondant ; signalées une fois, quand elles le deviennent
    const sans = regs => [...(retenues[k] ?? [])].filter(c => !new Set(Object.keys(regs).map(cible)).has(c));
    const orphelines = sans(apres).filter(c => !avant || !sans(avant).includes(c));
    if (orphelines.length) alertes.push(`Mesure(s) retenue(s) dans data/sanctions.json sans régime reconnu dans la liste : ${orphelines.join(", ")}. Régime levé, ou nom non reconnu par le script (table CIBLES) ?`);
    console.log(`${k} : ${Object.keys(apres).length} régimes (${res.url})${alertes.length ? ` · ${alertes.length} alerte(s)` : ""}`);
    if (alertes.length) {
      lignes.push(`### ${k} · ${src.nom}\n\nSource : ${res.url}\n\n${alertes.map(a => `- ${a}`).join("\n")}\n`);
      nouveau[k] = { source: res.url, releve: new Date().toISOString().slice(0, 10), regimes: Object.fromEntries(Object.entries(apres).sort()) };
    }
  }

  const changed = lignes.length > 0;
  if (changed) fs.writeFileSync(path.join(root, SNAP), JSON.stringify(nouveau, null, 1) + "\n");
  fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
  const rapport = [
    lignes.join("\n") || "Aucun changement de régime détecté.",
    echecs.length ? `### Sources en échec\n\n\`\`\`\n${echecs.join("\n")}\n\`\`\`` : "",
  ].filter(Boolean).join("\n\n") + "\n";
  fs.writeFileSync(path.join(root, "tmp/rapport-sanctions.md"), rapport);
  console.log("\n" + rapport);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  if (echecs.length) { console.error("Source(s) en échec :\n" + echecs.join("\n")); process.exit(1); }
})().catch(e => { console.error(e.stack); process.exit(1); });
