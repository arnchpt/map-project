// Modèle de script de récupération (voir data/pays/README.md, « Récupérer les données »)
// Lancé par .github/workflows/sources-pays.yml depuis la racine du dépôt, avec PAYS=<ISO3> et MODE=essai|proposer.
// Node 22, fetch natif, pas de dépendance hors package.json. N'écrit que dans data/pays/<iso3>/ ; rapport facultatif dans tmp/pays-<iso3>.md.
// Sortie en erreur (exit 1) si la source est injoignable ou si son format a changé : le job échoue et GitHub prévient par mail.
const fs = require("fs");

async function main() {
  const iso = (process.env.PAYS || "XXX").toLowerCase();
  // const res = await fetch("https://exemple.stat.xx/api/v1/commerce?partenaire=all");
  // if (!res.ok) throw new Error(`source injoignable : HTTP ${res.status}`);
  // const brut = await res.json();
  // ... transformer vers le format de data/pays/_modele/commerce.json, puis :
  // fs.writeFileSync(`data/pays/${iso}/commerce.json`, JSON.stringify(donnees, null, 1) + "\n");
  fs.mkdirSync("tmp", { recursive: true });
  fs.appendFileSync(`tmp/pays-${iso}.md`, `- exemple.js : rien à récupérer (modèle)\n`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
