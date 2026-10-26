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
| `data/votes/votes-<pays>.json` | Proximité des votes à l'ONU entre un pays focus et tous les autres, 0–100 (échelle absolue), produite par `scripts/votes_kappa.py`. 12 pays calculés : FRA, USA, CHN, RUS, DEU, GBR, IND, JPN, ITA, SAU, CAN, KOR. |
| `scripts/build.js` | Injecte le fond de carte, les noms et les votes dans le gabarit et écrit `dist/index.html`. |
| `data/trade/trade-<pays>.json` | Commerce de biens d'un pays focus par partenaire, 2025 et 2024, en Md$, produit par `scripts/imts.js`. Mêmes 12 pays. |
| `scripts/imts.js` | Interroge l'API publique du FMI (IMTS, sans clé) et écrit les échanges par partenaire. |
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

## Mettre à jour le commerce (FMI)

```sh
NODE_USE_ENV_PROXY=1 node scripts/imts.js FRA 2025 data/trade/trade-fra.json
npm run build
```

`NODE_USE_ENV_PROXY=1` n'est utile que derrière un proxy. Les flux par pays diffèrent de ceux des Douanes françaises (effet Rotterdam : Belgique et Pays-Bas gonflés, Chine minorée) ; l'écart est signalé sur la carte.

## Recalculer les votes à l'ONU

```sh
pip install numpy pandas pyreadr country_converter
python3 scripts/votes_kappa.py UNVotes.RData data/votes FRA,USA,CHN,RUS,DEU,GBR,IND,JPN,ITA,SAU,CAN,KOR
```

Score = (kappa + 1) / 2 × 100 : 50 = pas plus d'accord que le hasard, au-dessus = votent ensemble, en dessous = votent l'un contre l'autre. L'échelle est la même pour tous les pays focus, donc les scores se comparent d'un pays à l'autre. L'ancienne échelle relative (100 = partenaire le plus aligné du pays focus) reste disponible avec `--echelle relative`.

`UNVotes.RData` vient du jeu de données d'Erik Voeten ([Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ)). La version actuelle de `data/votes/` couvre les sessions 76 à 78 (septembre 2021 à juin 2024), à partir du fichier `UNVotes-1.RData` de la version 33 du jeu (juin 2024, [téléchargement direct](https://dataverse.harvard.edu/api/access/datafile/10295576)). Les versions suivantes du jeu ne publient plus les votes bruts, seulement les ideal points.

## Sources du prototype France

- Commerce : FMI, [IMTS](https://data.imf.org/en/datasets/IMF.STA:IMTS) (biens, 2025, en dollars, déclarations de la France). Comparaison avec le [Rapport 2026 du Trésor](https://www.tresor.economie.gouv.fr/Articles/2026/02/06/rapport-2026-sur-le-commerce-exterieur-de-la-france).
- Présences militaires : ministère des Armées, [Déploiement des armées françaises dans le monde](https://www.defense.gouv.fr/operations/deploiement-armees-francaises-monde) (page du 11/09/2026).
- Conflits et tensions : faits datés, une source par fait (voir la section « Sources et méthode » de la page).
- Proximité diplomatique : formule de la fiche méthode v1 (60 % votes ONU, 40 % organisations communes, plafond en cas de sanctions).
- Fond de carte : Natural Earth via [world-atlas](https://github.com/topojson/world-atlas), frontières de contrôle de fait.

## Limites connues

- Votes à l'ONU arrêtés à juin 2024 (sessions 76 à 78) : le jeu de Voeten ne publie plus les votes bruts après cette version.
- Votes : échelle absolue depuis octobre 2026. Sur le score final, 110 pays restent en « proximité faible » avec la France : la plupart votent sans affinité marquée avec elle (kappa proche de 0) et partagent peu d'organisations de la liste. Les classes disent donc « faible », pas « éloigné ».
- Votes : les sessions extraordinaires d'urgence (dont les résolutions sur l'Ukraine de 2022-2023) ne sont pas dans le jeu de Voeten. La Russie (47) vote ainsi un peu plus comme la France que l'Inde (45), ce qui reste masqué par le plafond sanctions.
- Commerce : biens seulement, services absents. La part de la France pour chaque partenaire (dépendance dans l'autre sens) n'est pas encore affichée.
- Conflits : données UCDP pas encore branchées (jeton d'accès à demander).
- Sanctions : 7 pays plafonnés (Russie et Biélorussie à 20, Iran, Corée du Nord, Myanmar, Venezuela et Nicaragua à 40), selon la règle validée le 26/10/2026. Liste à revoir à chaque renouvellement des régimes de l'UE.
