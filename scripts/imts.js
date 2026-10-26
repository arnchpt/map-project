// Commerce de biens d'un pays par partenaire, FMI IMTS (fiche méthode v1). API publique, sans clé.
// Usage : NODE_USE_ENV_PROXY=1 node scripts/imts.js FRA 2025 data/trade-fra.json   (la variable n'est utile que derrière un proxy)
// Sortie : {annee, unite, monde, values: {code ISO numérique: {x, m, xp, mp}}} en Md$, x = exportations FOB, m = importations CIF,
// xp et mp = même chose pour l'année précédente ; monde = total toutes destinations (code G001)
// Lit d'abord la structure du jeu (ordre des dimensions, codes indicateurs) et s'arrête si elle ne correspond pas.
const fs = require("fs");
const c = require("i18n-iso-countries");
const [, , reporter = "FRA", year = "2025", out = "trade.json"] = process.argv;
const BASE = "https://api.imf.org/external/sdmx/3.0";
const get = async (u, accept) => { const r = await fetch(u, { headers: { Accept: accept } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const DATA = "application/vnd.sdmx.data+json;version=2.0.0";

(async () => {
  const st = await get(`${BASE}/structure/dataflow/IMF.STA/IMTS/+?references=descendants&detail=full`, "application/vnd.sdmx.structure+json;version=2.0.0");
  const dsd = st.data.dataStructures[0], dims = dsd.dataStructureComponents.dimensionList.dimensions.map(d => d.id);
  console.log("dimensions", dims);
  const ind = st.data.codelists.find(l => /INDICATOR/i.test(l.id)).codes;
  const pick = re => (ind.find(k => re.test(k.name?.en ?? k.names?.en ?? "")) ?? {}).id;
  const X = pick(/exports.*FOB.*US dollar/i), M = pick(/imports.*CIF.*US dollar/i);
  if (!X || !M) throw new Error("codes exportations/importations introuvables : " + ind.map(k => k.id).join(","));
  console.log("indicateurs", X, M);
  const res = {}, world = {};
  // Une requête par indicateur : l'API refuse plusieurs clés quand l'une contient un joker
  for (const [code, f] of [[X, "x"], [M, "m"]]) {
    const key = dims.map(d => d === "COUNTRY" ? reporter : d === "INDICATOR" ? code : d === "FREQUENCY" ? "A" : "*").join(".");
    const js = await get(`${BASE}/data/dataflow/IMF.STA/IMTS/+/${key}`, DATA);
    const s = js.data.structures[0], sd = s.dimensions.series, iP = sd.findIndex(d => d.id === "COUNTERPART_COUNTRY");
    const tp = s.dimensions.observation[0].values, iY = tp.findIndex(v => v.value === year), iP1 = tp.findIndex(v => v.value === String(year - 1));
    const scale = s.attributes.series.find(a => a.id === "SCALE");
    if (scale) console.log(f, "attribut SCALE", scale.values.map(v => v.id), "(les valeurs reçues sont en dollars, voir contrôle ci-dessous)");
    if (iY < 0) throw new Error(`année ${year} absente pour ${code}`);
    for (const [k, ser] of Object.entries(js.data.dataSets[0].series)) {
      const iso = sd[iP].values[+k.split(":")[iP]].id, num = iso === "G001" ? "monde" : c.alpha3ToNumeric(iso);
      if (!num) continue; // agrégats régionaux
      for (const [i, key] of [[iY, f], [iP1, f + "p"]]) {
        const v = ser.observations[i]?.[0];
        if (v != null) ((num === "monde" ? world : (res[num] ??= {})))[key] = Math.round(+v / 1e8) / 10; // $ → Md$, 1 décimale
      }
    }
  }
  fs.writeFileSync(out, JSON.stringify({ annee: +year, unite: "Md$", source: "FMI, IMTS (api.imf.org, IMF.STA/IMTS)", monde: world, values: res }));
  console.log("partenaires", Object.keys(res).length, "monde", world, "DEU", res["276"], "USA", res["840"], "CHN", res["156"]);
})().catch(e => { console.error(e.message); process.exit(1); });
