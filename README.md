# Atlas géopolitique

Carte du monde interactive qui donne, en un coup d'œil, le contexte géopolitique d'un pays : commerce, présences militaires, conflits et tensions, proximité diplomatique. Chaque chiffre affiché renvoie à sa source.

Principe : « le contenu dicte le contexte ». Les couleurs et les scores sont calculés par du code à partir de sources publiques, sans appréciation éditoriale. Site gratuit et sans publicité.

- Site : https://arnchpt.github.io/map-project
- Prototype publié : https://claude.ai/artifact/WkfwEfDQmwWaVHyq7KXTiR (version France)
- Inventaire des sources : https://claude.ai/artifact/8ckzTBhh629bCvZMhuNJA1
- Fiche méthode des indicateurs (v1) : https://claude.ai/artifact/EvRippFyodo7pmgzxwHXe8

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `src/template.html` | La page : styles, faits France (présences, conflits, sanctions UE), carte (d3 + topojson), sélecteur du pays choisi. Contient trois emplacements remplis au build. |
| `data/names.json` | Noms de pays en français, par code ISO numérique. |
| `data/votes/votes-<pays>.json` | Proximité des votes à l'ONU entre un pays focus et tous les autres, 0–100 (échelle absolue), produite par `scripts/votes_kappa.py`. 11 pays calculés : FRA, USA, CHN, RUS, DEU, GBR, IND, JPN, ITA, CAN, KOR. |
| `data/politique/politique.json` | Forces politiques des 11 pays : chefs d'État et de gouvernement, sièges de la dernière élection, dirigeants de partis, avec sources. |
| `scripts/politique.js` | Contrôle les chefs d'État et de gouvernement contre Wikidata (détecteur d'écarts, n'écrit rien dans les données). |
| `scripts/build.js` | Liste les pays du sélecteur (nom, capitale, membre de l'UE), calcule le plafond sanctions de chaque paire et injecte fond de carte, noms, commerce, votes et plafonds dans le gabarit. |
| `data/sanctions.json` | Mesures de sanctions retenues (qui sanctionne qui, source de chaque mesure) et règle de plafonnement validée le 26/10/2026. À revoir à chaque renouvellement d'un régime. |
| `data/trade/trade-<pays>.json` | Commerce de biens d'un pays focus par partenaire, 2025 et 2024, en Md$, produit par `scripts/imts.js`. Mêmes 11 pays. |
| `scripts/imts.js` | Interroge l'API publique du FMI (IMTS, sans clé) et écrit les échanges par partenaire. |
| `data/orgs.json` | Liste fermée des 15 organisations et de leurs membres pleins, validée à la main. |
| `data/freshness.json` | Fraîcheur de chaque couche (période couverte, dernière vérification), affichée sur la carte. |
| `data/check/orgs-wikidata.json` | Membres des organisations selon Wikidata, dernier relevé (sert à détecter les changements). |
| `scripts/refresh-trade.js` | Actualise le commerce des 11 pays depuis le FMI et contrôle les nouveaux chiffres. |
| `scripts/orgs-wikidata.js` | Compare les organisations avec Wikidata et produit un rapport des écarts. |
| `.github/workflows/actualisation.yml` | Actualisation automatique quotidienne (voir plus bas). |
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

## Actualisation automatique

Le workflow `.github/workflows/actualisation.yml` tourne chaque jour à 5 h 17 UTC (et à la demande, onglet Actions, « Run workflow ») :

| Couche | Fréquence du contrôle | Ce qui se passe |
|---|---|---|
| Commerce (FMI IMTS) | chaque jour | Les 11 fichiers sont réinterrogés. Année visée : l'année précédente dès que le FMI la publie. |
| Organisations | chaque lundi | Wikidata est comparé à `data/orgs.json`. Wikidata n'est qu'un détecteur : la liste n'est jamais modifiée automatiquement. |
| Votes à l'ONU | à la main, une fois par an | Pas de source scriptable après juin 2024 (voir Limites). |

Règles de publication :

- rien de nouveau : aucun commit, sauf la date de vérification, rafraîchie au plus une fois par semaine ;
- chiffres modifiés, contrôles passés : commit direct sur `main`, GitHub Pages republie le site ;
- anomalie (total monde qui bouge de plus de 30 %, grand partenaire de plus de 50 %, partenaires manquants), changement d'année ou changement sur Wikidata : PR « Actualisation des données à relire », rien n'est publié avant fusion ;
- source en échec : le job échoue et GitHub envoie un mail.

Sur la carte, chaque couche indique sa période et sa date de vérification, avec la mention « Vérification en retard » si le dernier contrôle dépasse le délai prévu (14 jours pour le commerce, 21 pour les organisations).

Réglage nécessaire une fois : Settings → Actions → General → Workflow permissions, cocher « Read and write permissions » et « Allow GitHub Actions to create and approve pull requests ».

## Forces politiques

Chaque fiche pays commence par un bloc « Qui gouverne » : chef de l'État, chef du gouvernement, sièges de la chambre basse par parti, dirigeants des principaux partis, rattachement au gouvernement ou non. Les données sont dans `data/politique/politique.json`, relevées à la main le 26/10/2026, chaque dirigeant avec sa source ou la mention « non reconfirmé ».

- Sièges : résultat officiel de la dernière élection, figé jusqu'au scrutin suivant (défections et partielles non suivies). Russie : une seule source complète, marquée « non recoupé ». Chine : pas d'élection concurrentielle, le bloc le dit sans chiffre de sièges.
- Wikidata est fiable pour les chefs d'État et de gouvernement, mais pas pour les sièges (incomplets ou périmés) ni pour les dirigeants de partis (doublons, mandats échus). Il sert donc de détecteur :

```sh
NODE_USE_ENV_PROXY=1 node scripts/politique.js
```

compare les chefs d'État et de gouvernement du JSON à Wikidata (P35, P6) et écrit les écarts dans `tmp/rapport-politique.md`, sans rien modifier.
- Piste pour automatiser les sièges : l'Union interparlementaire (IPU Parline, `data.ipu.org`, API `api.data.ipu.org`) publie les résultats et la composition des 11 chambres. Hôtes à autoriser dans l'environnement avant de brancher un script.

## Recalculer les votes à l'ONU

```sh
pip install numpy pandas pyreadr country_converter
python3 scripts/votes_kappa.py UNVotes.RData data/votes FRA,USA,CHN,RUS,DEU,GBR,IND,JPN,ITA,CAN,KOR
```

Score = (kappa + 1) / 2 × 100 : 50 = pas plus d'accord que le hasard, au-dessus = votent ensemble, en dessous = votent l'un contre l'autre. L'échelle est la même pour tous les pays focus, donc les scores se comparent d'un pays à l'autre. L'ancienne échelle relative (100 = partenaire le plus aligné du pays focus) reste disponible avec `--echelle relative`.

`UNVotes.RData` vient du jeu de données d'Erik Voeten ([Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ)). La version actuelle de `data/votes/` couvre les sessions 76 à 78 (septembre 2021 à juin 2024), à partir du fichier `UNVotes-1.RData` de la version 33 du jeu (juin 2024, [téléchargement direct](https://dataverse.harvard.edu/api/access/datafile/10295576)). Les versions suivantes du jeu ne publient plus les votes bruts, seulement les ideal points.

## Sources du prototype France

- Commerce : FMI, [IMTS](https://data.imf.org/en/datasets/IMF.STA:IMTS) (biens, 2025, en dollars, déclarations de la France). Comparaison avec le [Rapport 2026 du Trésor](https://www.tresor.economie.gouv.fr/Articles/2026/02/06/rapport-2026-sur-le-commerce-exterieur-de-la-france).
- Présences militaires : ministère des Armées, [Déploiement des armées françaises dans le monde](https://www.defense.gouv.fr/operations/deploiement-armees-francaises-monde) (page du 11/09/2026).
- Conflits et tensions : faits datés, une source par fait (voir la section « Sources et méthode » de la page).
- Proximité diplomatique : formule de la fiche méthode v1 (60 % votes ONU, 40 % organisations communes, plafond en cas de sanctions).
- Fond de carte : Natural Earth via [world-atlas](https://github.com/topojson/world-atlas), frontières de contrôle de fait.

## Pays couverts

Le sélecteur propose 11 pays, retenus le 26/10/2026 : moyenne des rangs au PIB nominal 2025 (FMI, WEO d'octobre 2026) et aux dépenses militaires 2025 ([SIPRI, avril 2026](https://www.sipri.org/publications/2026/sipri-fact-sheets/trends-world-military-expenditure-2025)). Dans l'ordre : États-Unis, Chine, Allemagne, Royaume-Uni, Inde, Russie (ex aequo), Japon, France, Italie, puis Canada et Corée du Sud à égalité pour la 10e place (tous deux gardés). L'Arabie saoudite suit juste après.

Pour ces pays, commerce et proximité diplomatique sont calculés. Présences militaires, conflits et tensions ne sont renseignés que pour la France. Le plafond lié aux sanctions ne s'applique qu'aux pays de l'UE (France, Allemagne, Italie) : la règle pour les régimes des autres pays reste à définir.

## Limites connues

- Votes à l'ONU arrêtés à juin 2024 (sessions 76 à 78) : le jeu de Voeten ne publie plus les votes bruts après cette version.
- Votes : échelle absolue depuis octobre 2026. Sur le score final, 110 pays restent en « proximité faible » avec la France : la plupart votent sans affinité marquée avec elle (kappa proche de 0) et partagent peu d'organisations de la liste. Les classes disent donc « faible », pas « éloigné ».
- Votes : les sessions extraordinaires d'urgence (dont les résolutions sur l'Ukraine de 2022-2023) ne sont pas dans le jeu de Voeten. La Russie (47) vote ainsi un peu plus comme la France que l'Inde (45), ce qui reste masqué par le plafond sanctions.
- Commerce : biens seulement, services absents. La dépendance dans l'autre sens (part du pays choisi dans le commerce du partenaire) n'est pas encore affichée.
- Commerce de la Russie : la Russie ne publie plus le détail de ses échanges depuis 2022, les chiffres FMI sont probablement estimés à partir des déclarations des partenaires (à confirmer).
- Conflits : données UCDP pas encore branchées (jeton d'accès à demander).
- Sanctions : 7 pays plafonnés (Russie et Biélorussie à 20, Iran, Corée du Nord, Myanmar, Venezuela et Nicaragua à 40), selon la règle validée le 26/10/2026. Liste à revoir à chaque renouvellement des régimes de l'UE.
