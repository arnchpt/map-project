# Données nationales par pays (`data/pays/<iso3>/`)

Un dossier par pays, nommé par son code ISO alpha-3 en minuscules (`data/pays/aut/`, `data/pays/pol/`…). Chaque pays peut aussi être pays focus de la carte : ces fichiers décrivent ce que **ce pays** fait ou subit, vu par **ses propres sources** (ministères, parlement, institut statistique, commission électorale), et complètent les couches automatiques communes (FMI, votes ONU, organisations, sanctions UE, IPU, Wikidata).

Modèle à copier : [`_modele/`](_modele/). Contrôle : `node scripts/valider-pays.js <iso3>` (ou sans argument pour tous les pays).

## Fichiers

| Fichier | Obligatoire | Contenu |
|---|---|---|
| `sources.json` | oui | Inventaire des sources nationales : chaque fait des autres fichiers y renvoie par son `id`. |
| `presences.json` | oui | Présences militaires du pays **à l'étranger** et dans ses territoires hors métropole (couche « Présences militaires »). |
| `conflits.json` | oui | Faits datés : engagements armés, soutiens, retraits, tensions officielles (couche « Conflits et tensions »). |
| `politique.json` | oui | Chef de l'État, chef du gouvernement, chambre basse et partis (panneau « Qui gouverne »). |
| `commerce.json` | si la source existe | Commerce de biens par partenaire selon l'institut national, pour recouper le FMI (la carte reste sur le FMI, comparable entre pays). |

Un fichier sans données garde sa structure avec une liste vide et une note dans `sources.json` qui explique pourquoi (par exemple : « aucun déploiement publié par le ministère »). Un vide documenté vaut mieux qu'un chiffre de presse.

## Règles communes

- **Codes pays** : ISO alpha-3 en majuscules partout (`"hote": "LTU"`). Le build convertit en codes numériques. Seule exception admise : `XKX` pour le Kosovo (code UE, FMI, Banque mondiale), par exemple pour la KFOR.
- **Dates** : ISO (`2026-10-26`, ou `2026-10` si le jour n'est pas connu). `verifie` = date du dernier relevé.
- **Chaque fait a un `src`** qui existe dans `sources.json`. Pas de fait sans source.
- **Ordre de préférence des sources** : officiel national > organisation internationale (OTAN, ONU, UE, IPU) > institut de recherche > presse. Une source de presse porte `"type": "presse"` et n'est admise que si aucune source officielle n'existe.
- **Texte en français**, factuel, sans adjectif ni appréciation (`d` : une phrase, ce qui s'est passé et quand).
- **Ne pas recopier** ce que les couches automatiques produisent déjà : sanctions de l'UE, appartenance aux organisations, votes à l'ONU, commerce FMI.

## `sources.json`

| Champ | Valeurs |
|---|---|
| `id` | identifiant court, unique dans le fichier (`defense`, `stat`, `parlement`) |
| `nom`, `editeur`, `url` | intitulé lisible, organisme, lien direct vers la page ou le jeu de données |
| `type` | `officiel` · `international` · `recherche` · `presse` |
| `langue` | code ISO 639-1 de la source |
| `licence` | licence de réutilisation telle qu'indiquée par l'éditeur, ou « non précisée » |
| `cadence` | fréquence de mise à jour constatée (`mensuelle`, `annuelle`, `à chaque élection`, `irrégulière`) |
| `api`, `api_url`, `format` | `true` si un accès machine existe (API, CSV/JSON/XML stable), son URL, son format |
| `couches` | une ou plusieurs de `presences` · `conflits` · `politique` · `commerce` · `sanctions` · `autre` |
| `hotes` | liste des noms d'hôte exacts à joindre (`www.nsi.bg`, `api.stat.xx`), page et API comprises |
| `acces` | `verifie` si la page a été lue et le chiffre recoupé depuis la session, sinon `non_verifie` |
| `notes` | limites connues, écarts avec d'autres sources |

## `presences.json`

`presences` : déploiements localisables, un point par pays hôte et par mission.

| Champ | Valeurs |
|---|---|
| `hote` | ISO alpha-3 du pays hôte, `null` pour un territoire du pays lui-même |
| `lon`, `lat` | position du point (capitale ou base, 1 décimale suffit) |
| `nom` | intitulé officiel de la mission ou de la force |
| `cat` | `sov` territoire national hors métropole · `pre` forces stationnées par accord bilatéral · `dlia` coopération/liaison · `ope` opération nationale ou coalition · `otan` · `onu` · `ue` (mission ou opération PSDC) |
| `eff` | effectif publié (nombre), `null` si non publié |
| `depuis` | début du déploiement, `null` si inconnu |
| `src` | `id` de la source |

`non_localisees` : contributions sans pays hôte précis (missions navales, police du ciel tournante), `{ nom, eff (texte), src }`.

## `conflits.json`

`evenements`, un fait par pays concerné :

| Champ | Valeurs |
|---|---|
| `avec` | ISO alpha-3 de l'autre pays |
| `k` | `engage` engagement armé en cours · `soutien` soutien militaire déclaré à une partie en guerre · `retrait` départ des forces exigé par l'État hôte · `tension` différend officiel (territorial, frontalier, diplomatique) attesté par une déclaration, une protestation ou une procédure d'un des deux gouvernements |
| `t`, `d` | titre court et une phrase datée |
| `date` | date du fait ou de son début |
| `src` | `id` de la source |

## `politique.json`

Même structure qu'une entrée de [`data/politique/politique.json`](../politique/politique.json), plus un `src` sur `chef_etat`, `chef_gouv` et `chambre`. `qid` = identifiant Wikidata (contrôle automatique hebdomadaire). `ipu` = code d'élection et codes partis de l'IPU Parline s'ils existent : les sièges sont alors relus chaque semaine. `role` : `gouv` ou `hors`. `leaders` : relevé daté du jour de `verifie`.

## `commerce.json`

Total et 10 premiers partenaires selon l'institut national, dans sa devise et son concept (`commerce spécial`, `commerce général`, FOB/CAF), sans conversion. `notes` : écarts connus avec le FMI, par partenaire (effet Rotterdam, réexportations).

## Accès réseau

Les sessions passent par une liste blanche de domaines exacts, que seul Arnaud modifie. Un site national bloqué ne se contourne pas (ni miroir, ni GitHub Actions, ni autre machine) :

- la source est quand même documentée dans `sources.json`, avec ses `hotes` exacts et `"acces": "non_verifie"` ;
- un fait tiré d'une source non vérifiée garde son `src` mais ne sera affiché qu'une fois l'accès vérifié ;
- le fil d'intégration agrège les `hotes` non vérifiés des 27 pays en une seule liste, et Arnaud décide lesquels ouvrir.

## Qui écrit quoi

- Les fils « Sources nationales » écrivent **uniquement** dans `data/pays/<iso3>/`.
- Le code commun (`scripts/`, `src/`, `data/*.json` hors `pays/`) est modifié par le fil d'intégration UE, pour éviter les conflits.
