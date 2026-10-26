"""Proximité des votes AGNU avec un pays de référence (plan B, remplace les ideal points).

Mesure : kappa de Cohen sur les votes oui / abstention / non (Häge 2011, Political Analysis 19(3)),
calculé sur les seuls votes disputés (minorité >= 10 % des votants), par session, puis moyenne
des 3 dernières sessions. Absences et non-membres exclus. Score 0-100 : remise à l'échelle sur
l'étendue observée pour le pays de référence (0 = partenaire le moins aligné, 100 = le plus aligné).

Usage : python3 votes_kappa.py UNVotes.RData sortie.json [COW_ref=220 (France)]
"""
import json, sys
import numpy as np, pandas as pd, pyreadr, country_converter as coco

MIN_MINORITY, N_SESSIONS, MIN_VOTES = 0.10, 3, 20

def kappa(a, b):
    po = (a == b).mean()
    pe = sum((a == k).mean() * (b == k).mean() for k in (1, 2, 3))
    return (po - pe) / (1 - pe)

src, out = sys.argv[1], sys.argv[2]
ref = int(sys.argv[3]) if len(sys.argv) > 3 else 220
df = pyreadr.read_r(src)['completeVotes']
# ccode (COW) -> ISO3 : pris dans le fichier lui-même (colonne Country en ISO3 sur les sessions antérieures)
cow_iso3 = df[df.Country.str.len() == 3].drop_duplicates('ccode', keep='last').set_index('ccode').Country.replace({'YUG': 'SRB'}).to_dict()
df = df[df.vote.isin([1, 2, 3])]  # 1 oui, 2 abstention, 3 non
sessions = sorted(df.session.unique())[-N_SESSIONS:]
acc, n_votes = {}, {}
for s in sessions:
    W = df[df.session == s].pivot_table(index='rcid', columns='ccode', values='vote')
    minority = 1 - W.apply(lambda r: r.value_counts(normalize=True).max(), axis=1)
    W = W[minority >= MIN_MINORITY]
    f = W[ref]
    for c in W.columns:
        m = f.notna() & W[c].notna()
        if c != ref and m.sum() >= MIN_VOTES:
            acc.setdefault(int(c), []).append(kappa(f[m], W[c][m]))
            n_votes[int(c)] = n_votes.get(int(c), 0) + int(m.sum())
k = pd.Series({c: np.mean(v) for c, v in acc.items()})
score = (k - k.min()) / (k.max() - k.min()) * 100
iso = coco.convert([cow_iso3.get(c, 'XXX') for c in k.index], src='ISO3', to='ISOnumeric', not_found=None)
values, kap, nv = {}, {}, {}
for c, num in zip(k.index, iso):
    if not str(num).isdigit(): continue
    key = str(int(num))
    values[key], kap[key], nv[key] = round(float(score[c])), round(float(k[c]), 3), n_votes[c]
json.dump({"sessions": [int(s) for s in sessions], "method": "cohen_kappa_contested_votes_v1",
           "min_minority": MIN_MINORITY, "values": values, "kappa": kap, "n_votes": nv},
          open(out, 'w'), ensure_ascii=False)
print("sessions", sessions, "pays", len(values), {n: values.get(n) for n in ("276", "826", "840", "643", "156", "356")})
