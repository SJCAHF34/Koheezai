export type HIVDrug = {
  id: string;
  name: string;
  brandName?: string;
  dosage: string;
  class: string;
};

export const hivDrugs: HIVDrug[] = [
  {
    id: "abacavir",
    name: "Abacavir",
    brandName: "Ziagen",
    dosage: "300mg BID or 600mg QD",
    class: "NRTI"
  },
  {
    id: "tenofovir_df",
    name: "Tenofovir DF",
    brandName: "Viread",
    dosage: "300mg QD",
    class: "NRTI"
  },
  {
    id: "tenofovir_af",
    name: "Tenofovir AF",
    brandName: "Vemlidy",
    dosage: "25mg QD",
    class: "NRTI"
  },
  {
    id: "emtricitabine",
    name: "Emtricitabine",
    brandName: "Emtriva",
    dosage: "200mg QD",
    class: "NRTI"
  },
  {
    id: "lamivudine",
    name: "Lamivudine",
    brandName: "Epivir",
    dosage: "150mg BID or 300mg QD",
    class: "NRTI"
  },
  {
    id: "zidovudine",
    name: "Zidovudine",
    brandName: "Retrovir",
    dosage: "300mg BID",
    class: "NRTI"
  },
  {
    id: "efavirenz",
    name: "Efavirenz",
    brandName: "Sustiva",
    dosage: "600mg QD",
    class: "NNRTI"
  },
  {
    id: "rilpivirine",
    name: "Rilpivirine",
    brandName: "Edurant",
    dosage: "25mg QD",
    class: "NNRTI"
  },
  {
    id: "doravirine",
    name: "Doravirine",
    brandName: "Pifeltro",
    dosage: "100mg QD",
    class: "NNRTI"
  },
  {
    id: "etravirine",
    name: "Etravirine",
    brandName: "Intelence",
    dosage: "200mg BID",
    class: "NNRTI"
  },
  {
    id: "nevirapine",
    name: "Nevirapine",
    brandName: "Viramune",
    dosage: "200mg QD x 14d, then BID",
    class: "NNRTI"
  },
  {
    id: "atazanavir",
    name: "Atazanavir",
    brandName: "Reyataz",
    dosage: "300mg + ritonavir 100mg QD",
    class: "PI"
  },
  {
    id: "darunavir",
    name: "Darunavir/Ritonavir",
    brandName: "Prezista + Norvir",
    dosage: "800mg + ritonavir 100mg QD",
    class: "PI"
  },
  {
    id: "lopinavir_ritonavir",
    name: "Lopinavir/Ritonavir",
    brandName: "Kaletra",
    dosage: "400/100mg BID",
    class: "PI"
  },
  {
    id: "ritonavir",
    name: "Ritonavir",
    brandName: "Norvir",
    dosage: "Boosting dose varies",
    class: "PI"
  },
  {
    id: "bictegravir",
    name: "Bictegravir",
    brandName: "Biktarvy component",
    dosage: "50mg QD",
    class: "INSTI"
  },
  {
    id: "dolutegravir",
    name: "Dolutegravir",
    brandName: "Tivicay",
    dosage: "50mg QD or BID",
    class: "INSTI"
  },
  {
    id: "raltegravir",
    name: "Raltegravir",
    brandName: "Isentress",
    dosage: "400mg BID or 1200mg QD",
    class: "INSTI"
  },
  {
    id: "elvitegravir",
    name: "Elvitegravir",
    brandName: "Vitekta",
    dosage: "85-150mg QD (boosted)",
    class: "INSTI"
  },
  {
    id: "cabotegravir",
    name: "Cabotegravir",
    brandName: "Vocabria",
    dosage: "30mg QD or IM monthly",
    class: "INSTI"
  },
  {
    id: "enfuvirtide",
    name: "Enfuvirtide",
    brandName: "Fuzeon",
    dosage: "90mg SC BID",
    class: "Entry Inhibitor"
  },
  {
    id: "maraviroc",
    name: "Maraviroc",
    brandName: "Selzentry",
    dosage: "150-600mg BID",
    class: "Entry Inhibitor"
  },
  {
    id: "ibalizumab",
    name: "Ibalizumab",
    brandName: "Trogarzo",
    dosage: "2000mg IV loading, 800mg q2wk",
    class: "Entry Inhibitor"
  },
  {
    id: "fostemsavir",
    name: "Fostemsavir",
    brandName: "Rukobia",
    dosage: "600mg BID",
    class: "Entry Inhibitor"
  },
  {
    id: "lenacapavir",
    name: "Lenacapavir",
    brandName: "Sunlenca",
    dosage: "927mg PO then SC q6mo",
    class: "Capsid Inhibitor"
  },
  {
    id: "biktarvy",
    name: "Bictegravir/Emtricitabine/TAF",
    brandName: "Biktarvy",
    dosage: "50/200/25mg QD",
    class: "Combination"
  },
  {
    id: "triumeq",
    name: "Dolutegravir/Abacavir/Lamivudine",
    brandName: "Triumeq",
    dosage: "50/600/300mg QD",
    class: "Combination"
  },
  {
    id: "genvoya",
    name: "Elvitegravir/Cobicistat/FTC/TAF",
    brandName: "Genvoya",
    dosage: "150/150/200/10mg QD",
    class: "Combination"
  },
  {
    id: "symtuza",
    name: "Darunavir/Cobicistat/FTC/TAF",
    brandName: "Symtuza",
    dosage: "800/150/200/10mg QD",
    class: "Combination"
  },
  {
    id: "descovy",
    name: "Emtricitabine/Tenofovir AF",
    brandName: "Descovy",
    dosage: "200/25mg QD",
    class: "Combination"
  },
  {
    id: "truvada",
    name: "Emtricitabine/Tenofovir DF",
    brandName: "Truvada",
    dosage: "200/300mg QD",
    class: "Combination"
  },
  {
    id: "combivir",
    name: "Lamivudine/Zidovudine",
    brandName: "Combivir",
    dosage: "150/300mg BID",
    class: "Combination"
  },
  {
    id: "atripla",
    name: "Efavirenz/Emtricitabine/TDF",
    brandName: "Atripla",
    dosage: "600/200/300mg QD",
    class: "Combination"
  },
  {
    id: "complera",
    name: "Rilpivirine/Emtricitabine/TDF",
    brandName: "Complera",
    dosage: "25/200/300mg QD",
    class: "Combination"
  },
  {
    id: "odefsey",
    name: "Rilpivirine/Emtricitabine/TAF",
    brandName: "Odefsey",
    dosage: "25/200/25mg QD",
    class: "Combination"
  },
  {
    id: "stribild",
    name: "Elvitegravir/Cobicistat/FTC/TDF",
    brandName: "Stribild",
    dosage: "150/150/200/300mg QD",
    class: "Combination"
  },
  {
    id: "symfi",
    name: "Efavirenz/Lamivudine/TDF",
    brandName: "Symfi",
    dosage: "600/300/300mg QD",
    class: "Combination"
  },
  {
    id: "delstrigo",
    name: "Doravirine/Lamivudine/TDF",
    brandName: "Delstrigo",
    dosage: "100/300/300mg QD",
    class: "Combination"
  },
  {
    id: "dovato",
    name: "Dolutegravir/Lamivudine",
    brandName: "Dovato",
    dosage: "50/300mg QD",
    class: "Combination"
  },
  {
    id: "juluca",
    name: "Dolutegravir/Rilpivirine",
    brandName: "Juluca",
    dosage: "50/25mg QD",
    class: "Combination"
  },
  {
    id: "cabenuva",
    name: "Cabotegravir/Rilpivirine",
    brandName: "Cabenuva",
    dosage: "400/600mg IM monthly or 600/900mg q2mo",
    class: "Combination"
  },
  {
    id: "cimduo",
    name: "Lamivudine/Tenofovir DF",
    brandName: "Cimduo",
    dosage: "300/300mg QD",
    class: "Combination"
  },
  {
    id: "symfi_lo",
    name: "Efavirenz/Lamivudine/TDF",
    brandName: "Symfi Lo",
    dosage: "400/300/300mg QD",
    class: "Combination"
  },
  {
    id: "temixys",
    name: "Lamivudine/Tenofovir DF",
    brandName: "Temixys",
    dosage: "300/300mg QD",
    class: "Combination"
  },
];

export const drugClasses = [
  "NRTI",
  "NNRTI",
  "PI",
  "INSTI",
  "Entry Inhibitor",
  "Capsid Inhibitor",
  "Combination"
] as const;

export function getDrugsByClass(drugClass: string): HIVDrug[] {
  return hivDrugs.filter(drug => drug.class === drugClass);
}

export const prepDrugs: HIVDrug[] = [
  {
    id: "truvada",
    name: "Emtricitabine / Tenofovir DF",
    brandName: "Truvada",
    dosage: "200 mg / 300 mg QD",
    class: "PrEP",
  },
  {
    id: "descovy",
    name: "Emtricitabine / Tenofovir AF",
    brandName: "Descovy",
    dosage: "200 mg / 25 mg QD",
    class: "PrEP",
  },
  {
    id: "apretude",
    name: "Cabotegravir LA",
    brandName: "Apretude",
    dosage: "600 mg IM — initiation Day 1 & Day 29, then q2m",
    class: "PrEP",
  },
  {
    id: "yeztugo",
    name: "Lenacapavir",
    brandName: "Yeztugo",
    dosage: "927 mg SC every 6 months",
    class: "PrEP",
  },
];
