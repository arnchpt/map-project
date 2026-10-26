// Met à jour data/freshness.json pour une couche après un contrôle automatique.
// verifie n'est réécrit que si les chiffres ont changé ou s'il date de plus de 7 jours : un commit par semaine au plus quand rien ne bouge,
// ce qui garde le dépôt actif (GitHub suspend les tâches planifiées après 60 jours sans activité) sans remplir l'historique.
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "data/freshness.json");
const today = () => new Date().toISOString().slice(0, 10);

function touch(layer, { changed, donnees }) {
  const all = JSON.parse(fs.readFileSync(FILE, "utf8")), f = all[layer], t = today();
  const age = (Date.parse(t) - Date.parse(f.verifie)) / 864e5;
  if (!changed && age < 7) return false;
  f.verifie = t;
  if (changed) f.modifie = t;
  if (donnees) f.donnees = donnees;
  fs.writeFileSync(FILE, JSON.stringify(all, null, 1) + "\n");
  return true;
}

module.exports = { touch, today };
