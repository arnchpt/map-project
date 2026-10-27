// Forces politiques de tous les pays du sélecteur : data/politique/politique.json, complété par data/pays/<iso3>/politique.json
// pour les pays de l'UE qui n'y figurent pas (relevé des fils pays). Utilisé par scripts/politique.js et scripts/ipu-sieges.js.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function chargerPolitique() {
  const pol = JSON.parse(fs.readFileSync(path.join(root, "data/politique/politique.json"), "utf8"));
  const dir = path.join(root, "data/pays");
  for (const code of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const f = path.join(dir, code, "politique.json"), iso = code.toUpperCase();
    if (code.startsWith("_") || pol.pays[iso] || !fs.existsSync(f)) continue;
    const { pays, verifie, ...rest } = JSON.parse(fs.readFileSync(f, "utf8"));
    pol.pays[iso] = rest;
  }
  return pol;
}

module.exports = { chargerPolitique };
