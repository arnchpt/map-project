# Atlas géopolitique

Carte du monde interactive qui donne, en un coup d'œil, le contexte géopolitique d'un pays : commerce, présences militaires, conflits et tensions, proximité diplomatique. Chaque chiffre affiché renvoie à sa source.

Principe : « le contenu dicte le contexte ». Les couleurs et les scores sont calculés par du code à partir de sources publiques, sans appréciation éditoriale. Site gratuit et sans publicité.

- Prototype publié : https://claude.ai/artifact/WkfwEfDQmwWaVHyq7KXTiR (France seule renseignée)
- Inventaire des sources : https://claude.ai/artifact/8ckzTBhh629bCvZMhuNJA1
- Fiche méthode des indicateurs (v1) : https://claude.ai/artifact/EvRippFyodo7pmgzxwHXe8

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `src/template.html` | La page : styles, données France, carte (d3 + topojson). Contient trois emplacements remplis au build. |
| `data/names.json` | Noms de pays en français, par code ISO numérique. |
| `data/votes-fra.json` | Proximité des votes à l'ONU avec la France, 0–100, produite par `scripts/votes_kappa.py`. |
| `scripts/build.js` | Injecte le fond de carte, les noms et les votes dans le gabarit et écrit `dist/index.html`. |
| `scripts/votes_kappa.py` | Calcule l'accord de vote (kappa de Cohen, votes disputés, 3 dernières sessions) à partir de `UNVotes.RData`. |
| `dist/index.html` | Page assemblée pour l'artifact. |
| `docs/index.html` | Page assemblée pour GitHub Pages. |

## Construire la page

```sh
npm install
npm run build
```

Le build écrit deux fichiers :

- `dist/index.html` : fragment HTML (sans `<!doctype>` ni `<head>`), format attendu par la publication en artifact ;
- `docs/index.html` : la même page en document complet, servie par GitHub Pages (branche `main`, dossier `/docs`).

## Recalculer les votes à l'ONU

```sh
pip install numpy pandas pyreadr country_converter
python3 scripts/votes_kappa.py UNVotes.RData data/votes-fra.json
```

`UNVotes.RData` vient du jeu de données d'Erik Voeten ([Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ)). La version actuelle de `data/votes-fra.json` couvre les sessions 72 à 74 (2017-2019), seule copie accessible au moment du prototype ([GitHub](https://github.com/evoeten/United-Nations-General-Assembly-Votes-and-Ideal-Points)).

## Sources du prototype France

- Commerce : DG Trésor, [Rapport 2026 sur le commerce extérieur](https://www.tresor.economie.gouv.fr/Articles/2026/02/06/rapport-2026-sur-le-commerce-exterieur-de-la-france) (biens, 2025).
- Présences militaires : ministère des Armées, [Déploiement des armées françaises dans le monde](https://www.defense.gouv.fr/operations/deploiement-armees-francaises-monde) (page du 11/09/2026).
- Conflits et tensions : faits datés, une source par fait (voir la section « Sources et méthode » de la page).
- Proximité diplomatique : formule de la fiche méthode v1 (60 % votes ONU, 40 % organisations communes, plafond en cas de sanctions).
- Fond de carte : Natural Earth via [world-atlas](https://github.com/topojson/world-atlas), frontières de contrôle de fait.

## Limites connues

- Votes à l'ONU antérieurs à 2020 : les votes après l'invasion de l'Ukraine ne sont pas pris en compte.
- La remise à l'échelle 0–100 des votes classe 120 pays « éloignés » ; à revoir dans la fiche méthode avant d'étendre à d'autres pays.
- Commerce en euros depuis la source nationale ; la fiche méthode prévoit le FMI (IMTS, en dollars).
- Conflits : données UCDP pas encore branchées (jeton d'accès à demander).
- Sanctions : 7 pays plafonnés (Russie et Biélorussie à 20, Iran, Corée du Nord, Myanmar, Venezuela et Nicaragua à 40), selon la règle validée le 26/10/2026. Liste à revoir à chaque renouvellement des régimes de l'UE.
