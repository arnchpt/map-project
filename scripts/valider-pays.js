// Contrôle le contrat des données nationales (data/pays/<iso3>/, voir data/pays/README.md)
// Usage : node scripts/valider-pays.js [iso3 ...]   (sans argument : tous les pays ; _modele compris)
const fs = require("fs");
const path = require("path");
const isoc = require("i18n-iso-countries");
const dir = path.join(__dirname, "..", "data", "pays");

const CAT = ["sov", "pre", "dlia", "ope", "otan", "onu", "ue"];
const KIND = ["engage", "soutien", "retrait", "tension"];
const TYPE = ["officiel", "international", "recherche", "presse"];
const COUCHES = ["presences", "conflits", "politique", "commerce", "sanctions", "autre"];
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
// Codes admis hors ISO 3166 : XKX = Kosovo (code utilisé par l'UE, le FMI et la Banque mondiale)
const HORS_ISO = ["XKX"];

function valider(code) {
  const err = [], d = path.join(dir, code), iso = code.toUpperCase();
  const lire = (f, oblig = true) => {
    const p = path.join(d, f);
    if (!fs.existsSync(p)) { if (oblig) err.push(`${f} manquant`); return null; }
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { err.push(`${f} : JSON invalide (${e.message})`); return null; }
  };
  const pays = (v, ou, nul = false) => { if (v === null && nul) return; if (HORS_ISO.includes(v)) return; if (!isoc.isValid(v) || v !== String(v).toUpperCase() || v.length !== 3) err.push(`${ou} : code pays « ${v} » invalide (ISO alpha-3 majuscules)`); };
  const date = (v, ou, nul = true) => { if (v == null && nul) return; if (!DATE.test(v ?? "")) err.push(`${ou} : date « ${v} » invalide`); };
  const entete = (j, f) => { if (code !== "_modele" && j.pays !== iso) err.push(`${f} : "pays" doit valoir ${iso}`); date(j.verifie, `${f} verifie`, false); };

  const s = lire("sources.json"), ids = new Set();
  if (s) {
    entete(s, "sources.json");
    for (const [i, x] of (s.sources ?? []).entries()) {
      const ou = `sources.json #${i} (${x.id})`;
      for (const k of ["id", "nom", "editeur", "url", "type", "licence", "cadence", "couches"]) if (x[k] == null || x[k] === "") err.push(`${ou} : champ ${k} vide`);
      if (ids.has(x.id)) err.push(`${ou} : id en double`); ids.add(x.id);
      if (!/^https?:\/\//.test(x.url ?? "")) err.push(`${ou} : url invalide`);
      if (!TYPE.includes(x.type)) err.push(`${ou} : type « ${x.type} » hors liste`);
      if (!Array.isArray(x.hotes) || !x.hotes.length || x.hotes.some(h => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h))) err.push(`${ou} : hotes doit lister des noms d'hôte exacts`);
      if (!["verifie", "non_verifie"].includes(x.acces)) err.push(`${ou} : acces doit valoir verifie ou non_verifie`);
      if (typeof x.api !== "boolean") err.push(`${ou} : api doit être true/false`);
      if (x.api && !x.api_url) err.push(`${ou} : api_url manquante`);
      for (const c of x.couches ?? []) if (!COUCHES.includes(c)) err.push(`${ou} : couche « ${c} » hors liste`);
    }
  }
  const src = (v, ou) => { if (!ids.has(v)) err.push(`${ou} : src « ${v} » absente de sources.json`); };

  const p = lire("presences.json");
  if (p) {
    entete(p, "presences.json");
    for (const [i, x] of (p.presences ?? []).entries()) {
      const ou = `presences.json #${i}`;
      pays(x.hote, ou, true);
      if (typeof x.lon !== "number" || typeof x.lat !== "number" || Math.abs(x.lon) > 180 || Math.abs(x.lat) > 90) err.push(`${ou} : lon/lat invalides`);
      if (!x.nom) err.push(`${ou} : nom vide`);
      if (!CAT.includes(x.cat)) err.push(`${ou} : cat « ${x.cat} » hors liste`);
      if (x.eff !== null && typeof x.eff !== "number") err.push(`${ou} : eff doit être un nombre ou null`);
      date(x.depuis, ou); src(x.src, ou);
    }
    for (const [i, x] of (p.non_localisees ?? []).entries()) { if (!x.nom) err.push(`presences.json non_localisees #${i} : nom vide`); src(x.src, `presences.json non_localisees #${i}`); }
  }

  const c = lire("conflits.json");
  if (c) {
    entete(c, "conflits.json");
    for (const [i, x] of (c.evenements ?? []).entries()) {
      const ou = `conflits.json #${i}`;
      pays(x.avec, ou);
      if (!KIND.includes(x.k)) err.push(`${ou} : k « ${x.k} » hors liste`);
      if (!x.t || !x.d) err.push(`${ou} : t ou d vide`);
      date(x.date, ou, false); src(x.src, ou);
    }
  }

  const g = lire("politique.json");
  if (g) {
    entete(g, "politique.json");
    for (const k of ["chef_etat", "chef_gouv"]) if (g[k]) { if (!g[k].nom || !g[k].fonction) err.push(`politique.json ${k} : nom ou fonction vide`); date(g[k].depuis, `politique.json ${k}`); src(g[k].src, `politique.json ${k}`); }
    if (!g.chef_etat) err.push("politique.json : chef_etat manquant");
    if (g.chambre) {
      for (const k of ["nom", "sieges", "majorite", "election"]) if (g.chambre[k] == null) err.push(`politique.json chambre : ${k} manquant`);
      date(g.chambre.election, "politique.json chambre", false); src(g.chambre.src, "politique.json chambre");
      const tot = (g.partis ?? []).reduce((t, x) => t + (x.sieges ?? 0), 0);
      if (tot > g.chambre.sieges) err.push(`politique.json : somme des sièges (${tot}) > ${g.chambre.sieges}`);
    }
    for (const [i, x] of (g.partis ?? []).entries()) if (!x.nom || !["gouv", "hors"].includes(x.role)) err.push(`politique.json partis #${i} : nom vide ou role hors gouv/hors`);
  }

  const m = lire("commerce.json", false);
  if (m) {
    entete(m, "commerce.json"); src(m.src, "commerce.json");
    for (const k of ["annee", "devise", "unite", "concept", "total"]) if (m[k] == null) err.push(`commerce.json : ${k} manquant`);
    for (const [i, x] of (m.partenaires ?? []).entries()) { pays(x.pays, `commerce.json partenaires #${i}`); if (typeof x.x !== "number" || typeof x.m !== "number") err.push(`commerce.json partenaires #${i} : x et m doivent être des nombres`); }
    for (const k of Object.keys(m.notes ?? {})) pays(k, `commerce.json notes ${k}`);
  }
  return err;
}

const codes = process.argv.length > 2 ? process.argv.slice(2).map(c => c.toLowerCase())
  : fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
let ko = 0;
for (const code of codes) {
  const err = valider(code);
  console.log(err.length ? `✗ ${code} (${err.length})\n  ${err.join("\n  ")}` : `✓ ${code}`);
  if (err.length) ko++;
}
process.exit(ko ? 1 : 0);
