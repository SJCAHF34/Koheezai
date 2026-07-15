export interface StoreLocation {
  id: string;
  name: string;
}

export interface StoreRegion {
  region: string;
  shortName: string;
  color: string;
  dotColor: string;
  stores: StoreLocation[];
}

export const STORE_REGIONS: StoreRegion[] = [
  {
    region: "Western Region",
    shortName: "West",
    color: "text-violet-700",
    dotColor: "bg-violet-500",
    stores: [
      { id: "1412", name: "RX Carson PCM Hub" },
      { id: "1408", name: "RX Castro" },
      { id: "1410", name: "RX Hollywood Flagship" },
      { id: "1416", name: "RX Cabrini" },
      { id: "1402", name: "RX Downtown" },
      { id: "1439", name: "RX Hillcrest" },
      { id: "1441", name: "RX Mi Farmacia" },
      { id: "1409", name: "RX Oakland" },
      { id: "1413", name: "RX East Los Angeles" },
      { id: "1415", name: "RX San Diego Flagship" },
      { id: "1417", name: "RX Pike Street" },
      { id: "1310", name: "RX Tacoma" },
      { id: "1440", name: "RX Vista" },
      { id: "1423", name: "RX Las Vegas" },
      { id: "1404", name: "RX Valley" },
      { id: "1406", name: "RX West Hollywood" },
      { id: "1405", name: "RX Westside" },
      { id: "1407", name: "RX Long Beach" },
    ],
  },
  {
    region: "Southern – South Region",
    shortName: "South",
    color: "text-cyan-700",
    dotColor: "bg-cyan-500",
    stores: [
      { id: "5410", name: "RX Biscayne" },
      { id: "5506", name: "RX Campus" },
      { id: "5510", name: "RX Hollywood FL" },
      { id: "5423", name: "RX Ft. Myers" },
      { id: "5505", name: "RX Carolina" },
      { id: "5413", name: "RX Coconut Grove" },
      { id: "5409", name: "RX North Miami Beach" },
      { id: "5408", name: "RX Pensacola" },
      { id: "5420", name: "RX Delray Beach" },
      { id: "5402", name: "RX Jacksonville" },
      { id: "5416", name: "RX Oakland Park" },
      { id: "5412", name: "RX South Beach" },
      { id: "5401", name: "RX North Point" },
      { id: "5422", name: "RX Orlando OTC" },
      { id: "5405", name: "RX Orlando" },
      { id: "3412", name: "RX West Palm Beach" },
      { id: "5415", name: "RX PCM South" },
      { id: "5407", name: "RX Sunrise" },
      { id: "5504", name: "RX St. Petersburg" },
      { id: "5404", name: "RX Wilton Manors" },
      { id: "5406", name: "RX Safety Harbor" },
    ],
  },
  {
    region: "Southern – North Region",
    shortName: "South North",
    color: "text-emerald-700",
    dotColor: "bg-emerald-500",
    stores: [
      { id: "8104", name: "RX Ansley" },
      { id: "5501", name: "RX Baton Rouge" },
      { id: "5419", name: "RX Auburn Avenue" },
      { id: "2410", name: "RX Austin" },
      { id: "2408", name: "RX Binz" },
      { id: "2403", name: "RX Columbia" },
      { id: "5511", name: "RX Cumberland" },
      { id: "2404", name: "RX Dallas OTC" },
      { id: "2401", name: "RX Fort Worth" },
      { id: "2409", name: "RX Dallas Market Center" },
      { id: "2407", name: "RX Houston OTC" },
      { id: "5507", name: "RX Jackson" },
      { id: "2400", name: "RX Medical City" },
      { id: "5417", name: "RX Peachtree" },
      { id: "5414", name: "RX Lithonia" },
      { id: "5418", name: "RX Newnan" },
      { id: "5421", name: "RX Piedmont" },
    ],
  },
  {
    region: "Northern Region",
    shortName: "North",
    color: "text-blue-700",
    dotColor: "bg-blue-500",
    stores: [
      { id: "3404", name: "RX Brooklyn" },
      { id: "3413", name: "RX Bronx" },
      { id: "3411", name: "RX Chicago OTC" },
      { id: "3410", name: "RX Baltimore" },
      { id: "2402", name: "RX Columbus" },
      { id: "2405", name: "RX Cleveland" },
      { id: "4401", name: "RX K-Street" },
      { id: "3414", name: "RX Capitol Hill" },
      { id: "3408", name: "RX P4H City View" },
      { id: "3409", name: "RX Philadelphia" },
      { id: "3407", name: "RX Manhattan" },
      { id: "3406", name: "RX Queens" },
      { id: "3402", name: "RX P4H Farmingdale" },
    ],
  },
  {
    region: "Central Fill",
    shortName: "CF",
    color: "text-amber-700",
    dotColor: "bg-amber-500",
    stores: [
      { id: "CF-CARSON", name: "CF RX Carson" },
    ],
  },
];

export const ALL_STORES: StoreLocation[] = STORE_REGIONS.flatMap((r) => r.stores);

export function findStore(siteId: string): StoreLocation | undefined {
  return ALL_STORES.find((s) => s.id === siteId);
}

export function findStoreRegion(siteId: string): StoreRegion | undefined {
  return STORE_REGIONS.find((r) => r.stores.some((s) => s.id === siteId));
}
