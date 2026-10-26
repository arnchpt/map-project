"""Proximité des votes AGNU entre chaque pays focus et tous les autres États (fiche méthode v1, plan B).

Mesure : kappa de Cohen sur les votes oui / abstention / non (Häge 2011, Political Analysis 19(3)),
calculé sur les seuls votes disputés (minorité >= 10 % des votants), par session, puis moyenne
des 3 dernières sessions. Absences et non-membres exclus. Le filtre « disputé » est le même pour
tous les pays focus, donc les kappas sont comparables d'un pays focus à l'autre.

Score 0-100, échelle absolue commune à tous les pays focus : score = (kappa + 1) / 2 x 100.
50 = accord qui ne dépasse pas le hasard, au-dessus = votent ensemble, en dessous = votent l'un contre l'autre.
L'ancienne échelle relative (0 = partenaire le moins aligné du pays focus, 100 = le plus aligné) reste disponible
avec --echelle relative, mais ses scores ne se comparent pas d'un pays focus à l'autre.

Usage : python3 votes_kappa.py UNVotes.RData dossier_sortie FRA,USA,CHN [--echelle absolue|relative]
Écrit dossier_sortie/votes-<iso3 en minuscules>.json pour chaque pays focus.
"""
import json, os, sys
import numpy as np, pandas as pd, pyreadr, country_converter as coco

MIN_MINORITY, N_SESSIONS, MIN_VOTES = 0.10, 3, 20

def kappa(a, b):
    po = (a == b).mean()
    pe = sum((a == k).mean() * (b == k).mean() for k in (1, 2, 3))
    return (po - pe) / (1 - pe)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
src, out_dir = args[0], args[1]
focus = (args[2] if len(args) > 2 else "FRA").split(",")
echelle = "relative" if "--echelle" in sys.argv and sys.argv[sys.argv.index("--echelle") + 1] == "relative" else "absolue"

df = pyreadr.read_r(src)['completeVotes']
# ccode (COW) -> ISO3 : pris dans le fichier lui-même (colonne Country en ISO3)
cow_iso3 = df[df.Country.str.len() == 3].drop_duplicates('ccode', keep='last').set_index('ccode').Country.replace({'YUG': 'SRB'}).to_dict()
iso3_cow = {v: k for k, v in cow_iso3.items()}
df = df[df.vote.isin([1, 2, 3])]  # 1 oui, 2 abstention, 3 non
sessions = sorted(df.session.unique())[-N_SESSIONS:]
mats = []
for s in sessions:
    W = df[df.session == s].pivot_table(index='rcid', columns='ccode', values='vote')
    minority = 1 - W.apply(lambda r: r.value_counts(normalize=True).max(), axis=1)
    mats.append(W[minority >= MIN_MINORITY])

os.makedirs(out_dir, exist_ok=True)
for f_iso in focus:
    ref = iso3_cow[f_iso]
    acc, n_votes = {}, {}
    for W in mats:
        f = W[ref]
        for c in W.columns:
            m = f.notna() & W[c].notna()
            if c != ref and m.sum() >= MIN_VOTES:
                acc.setdefault(int(c), []).append(kappa(f[m], W[c][m]))
                n_votes[int(c)] = n_votes.get(int(c), 0) + int(m.sum())
    k = pd.Series({c: np.mean(v) for c, v in acc.items()})
    score = (k - k.min()) / (k.max() - k.min()) * 100 if echelle == "relative" else (k + 1) / 2 * 100
    iso = coco.convert([cow_iso3.get(c, 'XXX') for c in k.index], src='ISO3', to='ISOnumeric', not_found=None)
    values, kap, nv = {}, {}, {}
    for c, num in zip(k.index, iso):
        if not str(num).isdigit(): continue
        key = str(int(num))
        values[key], kap[key], nv[key] = round(float(score[c])), round(float(k[c]), 3), n_votes[c]
    out = os.path.join(out_dir, f"votes-{f_iso.lower()}.json")
    json.dump({"focus": f_iso, "sessions": [int(s) for s in sessions], "method": "cohen_kappa_contested_votes_v1",
               "echelle": echelle, "min_minority": MIN_MINORITY, "values": values, "kappa": kap, "n_votes": nv},
              open(out, 'w'), ensure_ascii=False)
    print(f_iso, "pays", len(values), {n: values.get(n) for n in ("250", "276", "826", "840", "643", "156", "356")})
