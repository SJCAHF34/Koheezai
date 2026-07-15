export type UserRole =
  | "data_entry_tech"
  | "pv2_tech"
  | "delivery_tech"
  | "pharmacist_1"
  | "pharmacist_2"
  | "pharmacy_director"
  | "regional_pharmacy_director"
  | "chief_pharmacy_officer";

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  region?: string;
  taskRoles?: UserRole[];
  additionalSites?: Array<{ siteId: string; siteName: string }>;
}

type ProfileEntry = Pick<UserProfile, "role" | "siteId" | "siteName" | "region" | "taskRoles" | "additionalSites"> & { name?: string };

const PROFILE_MAP: Record<string, ProfileEntry> = {
  // ── CPO ─────────────────────────────────────────────────────────────────────
  "cpo@koheez.ai": {
    name: "Chief Pharmacy Officer",
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },
  "cpo@aidshealth.org": {
    name: "Chief Pharmacy Officer",
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },
  "jeremy.zellers@aidshealth.org": {
    name: "Jeremy Zeller",
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },

  // ── RPD ─────────────────────────────────────────────────────────────────────
  "regionaldirector@koheez.ai": {
    name: "Regional Pharmacy Director",
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "regional@aidshealth.org": {
    name: "Regional Pharmacy Director",
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "negar.shirazpour@aidshealth.org": {
    name: "Negar Shirazpour",
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "test@koheez.ai": {
    name: "Test User",
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },

  // ── Generic demo accounts ────────────────────────────────────────────────────
  "director@koheez.ai": {
    name: "Pharmacy Director",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
  },
  "techs@koheez.ai": {
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    taskRoles: ["data_entry_tech", "pv2_tech", "delivery_tech"],
  },
  "tech@koheez.ai": {
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    taskRoles: ["data_entry_tech", "pv2_tech", "delivery_tech"],
  },

  // ── RX Tacoma (1310) ─────────────────────────────────────────────────────────
  "stephanie.nam@aidshealth.org": {
    name: "Stephanie Nam",
    role: "pharmacy_director",
    siteId: "1310",
    siteName: "RX Tacoma",
    region: "Western Region",
  },

  // ── RX Pike Street (1417) ───────────────────────────────────────────────────
  "seth.collins@aidshealth.org": {
    name: "Seth Collins",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    additionalSites: [{ siteId: "1310", siteName: "RX Tacoma" }],
  },
  "claire.wood@aidshealth.org": {
    name: "Claire Wood",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["data_entry_tech"],
  },
  "micah.bergaguilar@aidshealth.org": {
    name: "Micah Bergaguilar",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["data_entry_tech"],
  },
  "pairiss.wilcox@aidshealth.org": {
    name: "Pairiss Wilcox",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["data_entry_tech"],
  },
  "anh.do@aidshealth.org": {
    name: "Anh Do",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["data_entry_tech"],
  },
  "clayton.conley@aidshealth.org": {
    name: "Clayton Conley",
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["pharmacist_1"],
  },
  "debbie.nguyen@aidshealth.org": {
    name: "Debbie Nguyen",
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["pharmacist_1"],
  },
  "uyen-vy.nguyen@aidshealth.org": {
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["pharmacist_1"],
  },

  // ── RX Castro (1408) — Western ──────────────────────────────────────────────
  "ryan.leong@aidshealth.org": {
    name: "Ryan Leong",
    role: "pharmacy_director",
    siteId: "1408",
    siteName: "RX Castro",
    region: "Western Region",
  },

  // ── RX Downtown (1402) — Western ────────────────────────────────────────────
  "albert.chen@aidshealth.org": {
    name: "Albert Chen",
    role: "pharmacy_director",
    siteId: "1402",
    siteName: "RX Downtown",
    region: "Western Region",
  },

  // ── RX Hollywood Flagship (1410) — Western ──────────────────────────────────
  "jrockwoodpharmd@gmail.com": {
    name: "Jason Rockwood",
    role: "pharmacy_director",
    siteId: "1410",
    siteName: "RX Hollywood Flagship",
    region: "Western Region",
  },
  "jason.rockwood@aidshealth.org": {
    name: "Jason Rockwood",
    role: "pharmacy_director",
    siteId: "1410",
    siteName: "RX Hollywood Flagship",
    region: "Western Region",
  },

  // ── RX Cabrini (1416) — Western ─────────────────────────────────────────────
  "elizabeth.camper@aidshealth.org": {
    name: "Elizabeth Camper",
    role: "pharmacy_director",
    siteId: "1416",
    siteName: "RX Cabrini",
    region: "Western Region",
  },

  // ── RX Mi Farmacia (1441) — Western ─────────────────────────────────────────
  "catalic.chavira@aidshealth.org": {
    name: "Catalic Chavira Mendoza",
    role: "pharmacy_director",
    siteId: "1441",
    siteName: "RX Mi Farmacia",
    region: "Western Region",
  },

  // ── RX Hillcrest (1439) — Western ───────────────────────────────────────────
  "kaylene.devries@aidshealth.org": {
    name: "Kaylene De Vries",
    role: "pharmacy_director",
    siteId: "1439",
    siteName: "RX Hillcrest",
    region: "Western Region",
  },

  // ── RX San Diego Flagship (1415) — Western ──────────────────────────────────
  "sam.toma@aidshealth.org": {
    name: "Sam Toma",
    role: "pharmacy_director",
    siteId: "1415",
    siteName: "RX San Diego Flagship",
    region: "Western Region",
  },

  // ── RX Vista (1440) — Western ───────────────────────────────────────────────
  "walid.mohammad@aidshealth.org": {
    name: "Walid Mohammad",
    role: "pharmacy_director",
    siteId: "1440",
    siteName: "RX Vista",
    region: "Western Region",
  },

  // ── RX Las Vegas (1423) — Western ───────────────────────────────────────────
  "hiram.juarbe@aidshealth.org": {
    name: "Hiram Juarbe Torres",
    role: "pharmacy_director",
    siteId: "1423",
    siteName: "RX Las Vegas",
    region: "Western Region",
  },
  "juanpedro.flores@aidshealth.org": {
    name: "Juan Pedro Flores",
    role: "pharmacy_director",
    siteId: "1423",
    siteName: "RX Las Vegas",
    region: "Western Region",
  },

  // ── RX Westside (1405) — Western ────────────────────────────────────────────
  "sam.badanat@aidshealth.org": {
    name: "Sam Badanat",
    role: "pharmacy_director",
    siteId: "1405",
    siteName: "RX Westside",
    region: "Western Region",
  },

  // ── RX Long Beach (1407) — Western ──────────────────────────────────────────
  "eric.azcheri@aidshealth.org": {
    name: "Eric Azcheri",
    role: "pharmacy_director",
    siteId: "1407",
    siteName: "RX Long Beach",
    region: "Western Region",
  },

  // ── RX East Los Angeles (1413) — Western ────────────────────────────────────
  "keyvan.shahriary@aidshealth.org": {
    name: "Keyvan Shahriary",
    role: "pharmacy_director",
    siteId: "1413",
    siteName: "RX East Los Angeles",
    region: "Western Region",
  },

  // ── RX Biscayne (5410) — Southern South ─────────────────────────────────────
  "samantha.kim@aidshealth.org": {
    name: "Samantha Kim",
    role: "pharmacy_director",
    siteId: "5410",
    siteName: "RX Biscayne",
    region: "Southern – South Region",
  },

  // ── RX Campus (5506) — Southern South ───────────────────────────────────────
  "analis.martin@aidshealth.org": {
    name: "Analis Martin",
    role: "pharmacy_director",
    siteId: "5506",
    siteName: "RX Campus",
    region: "Southern – South Region",
  },

  // ── RX Ft. Myers (5423) — Southern South ────────────────────────────────────
  "shadraka.mcintosh@aidshealth.org": {
    name: "Shadraka McIntosh",
    role: "pharmacy_director",
    siteId: "5423",
    siteName: "RX Ft. Myers",
    region: "Southern – South Region",
  },

  // ── RX Coconut Grove (5413) — Southern South ────────────────────────────────
  "zachary.kushner@aidshealth.org": {
    name: "Zachary Kushner",
    role: "pharmacy_director",
    siteId: "5413",
    siteName: "RX Coconut Grove",
    region: "Southern – South Region",
  },

  // ── RX North Miami Beach (5409) — Southern South ────────────────────────────
  "venessa.diprima@aidshealth.org": {
    name: "Venessa DiPrima",
    role: "pharmacy_director",
    siteId: "5409",
    siteName: "RX North Miami Beach",
    region: "Southern – South Region",
  },

  // ── RX Pensacola (5408) — Southern South ────────────────────────────────────
  "kristen.stokes@aidshealth.org": {
    name: "Kristen Stokes",
    role: "pharmacy_director",
    siteId: "5408",
    siteName: "RX Pensacola",
    region: "Southern – South Region",
  },

  // ── RX Delray Beach (5420) — Southern South ─────────────────────────────────
  "alejandra.levy@aidshealth.org": {
    name: "Alejandra Levy",
    role: "pharmacy_director",
    siteId: "5420",
    siteName: "RX Delray Beach",
    region: "Southern – South Region",
  },

  // ── RX Jacksonville (5402) — Southern South ─────────────────────────────────
  "ryan.ford@aidshealth.org": {
    name: "Ryan Ford",
    role: "pharmacy_director",
    siteId: "5402",
    siteName: "RX Jacksonville",
    region: "Southern – South Region",
  },

  // ── RX Oakland Park (5416) — Southern South ─────────────────────────────────
  "maksim.yermakov@aidshealth.org": {
    name: "Maksim Yermakov",
    role: "pharmacy_director",
    siteId: "5416",
    siteName: "RX Oakland Park",
    region: "Southern – South Region",
  },

  // ── RX South Beach (5412) — Southern South ──────────────────────────────────
  "carlos.palacios@aidshealth.org": {
    name: "Carlos Palacios",
    role: "pharmacy_director",
    siteId: "5412",
    siteName: "RX South Beach",
    region: "Southern – South Region",
  },

  // ── RX North Point (5401) — Southern South ──────────────────────────────────
  "sean.williams@aidshealth.org": {
    name: "Sean Williams",
    role: "pharmacy_director",
    siteId: "5401",
    siteName: "RX North Point",
    region: "Southern – South Region",
  },

  // ── RX Orlando OTC (5422) — Southern South ──────────────────────────────────
  "jonathan.flores@aidshealth.org": {
    name: "Jonathan Flores",
    role: "pharmacy_director",
    siteId: "5422",
    siteName: "RX Orlando OTC",
    region: "Southern – South Region",
  },

  // ── RX Orlando (5405) — Southern South ──────────────────────────────────────
  "lonnie.strom@aidshealth.org": {
    name: "Lonnie Strom",
    role: "pharmacy_director",
    siteId: "5405",
    siteName: "RX Orlando",
    region: "Southern – South Region",
  },

  // ── RX West Palm Beach (3412) — Southern South ──────────────────────────────
  "adrian.velazquez@aidshealth.org": {
    name: "Adrian Velazquez",
    role: "pharmacy_director",
    siteId: "3412",
    siteName: "RX West Palm Beach",
    region: "Southern – South Region",
  },
  "anthony.pierre@aidshealth.org": {
    name: "Anthony Pierre",
    role: "pharmacy_director",
    siteId: "3412",
    siteName: "RX West Palm Beach",
    region: "Southern – South Region",
  },

  // ── RX St. Petersburg (5504) — Southern South ───────────────────────────────
  "lisa.romo@aidshealth.org": {
    name: "Lisa Romo",
    role: "pharmacy_director",
    siteId: "5504",
    siteName: "RX St. Petersburg",
    region: "Southern – South Region",
  },

  // ── RX Sunrise (5407) — Southern South ──────────────────────────────────────
  "ladoucha.moore@aidshealth.org": {
    name: "LaDoucha Moore",
    role: "pharmacy_director",
    siteId: "5407",
    siteName: "RX Sunrise",
    region: "Southern – South Region",
  },

  // ── RX Wilton Manors (5404) — Southern South ────────────────────────────────
  "lynette.price@aidshealth.org": {
    name: "Lynette Price",
    role: "pharmacy_director",
    siteId: "5404",
    siteName: "RX Wilton Manors",
    region: "Southern – South Region",
  },

  // ── RX Safety Harbor (5406) — Southern South ────────────────────────────────
  "amanda.haddad@aidshealth.org": {
    name: "Amanda Haddad",
    role: "pharmacy_director",
    siteId: "5406",
    siteName: "RX Safety Harbor",
    region: "Southern – South Region",
  },

  // ── RX Ansley (8104) — Southern North ───────────────────────────────────────
  "corey.woodward@aidshealth.org": {
    name: "Corey Woodward",
    role: "pharmacy_director",
    siteId: "8104",
    siteName: "RX Ansley",
    region: "Southern – North Region",
  },

  // ── RX Baton Rouge (5501) — Southern North ──────────────────────────────────
  "simone.mack@aidshealth.org": {
    name: "Simone Mack",
    role: "pharmacy_director",
    siteId: "5501",
    siteName: "RX Baton Rouge",
    region: "Southern – North Region",
  },

  // ── RX Auburn Avenue (5419) — Southern North ────────────────────────────────
  "chandra.garner@aidshealth.org": {
    name: "Chandra Garner",
    role: "pharmacy_director",
    siteId: "5419",
    siteName: "RX Auburn Avenue",
    region: "Southern – North Region",
  },

  // ── RX Austin (2410) — Southern North ───────────────────────────────────────
  "riko.charme@aidshealth.org": {
    name: "Riko Charme",
    role: "pharmacy_director",
    siteId: "2410",
    siteName: "RX Austin",
    region: "Southern – North Region",
  },

  // ── RX Binz (2408) — Southern North ─────────────────────────────────────────
  "trisha.patel@aidshealth.org": {
    name: "Trisha Patel",
    role: "pharmacy_director",
    siteId: "2408",
    siteName: "RX Binz",
    region: "Southern – North Region",
  },

  // ── RX Columbia (2403) — Southern North ─────────────────────────────────────
  "whitney.williams@aidshealth.org": {
    name: "Whitney Williams",
    role: "pharmacy_director",
    siteId: "2403",
    siteName: "RX Columbia",
    region: "Southern – North Region",
  },

  // ── RX Cumberland (5511) — Southern North ───────────────────────────────────
  "bobby.couch@aidshealth.org": {
    name: "Bobby Couch",
    role: "pharmacy_director",
    siteId: "5511",
    siteName: "RX Cumberland",
    region: "Southern – North Region",
  },

  // ── RX Dallas OTC (2404) — Southern North ───────────────────────────────────
  "gregory.matuszewski@aidshealth.org": {
    name: "Gregory Matuszewski",
    role: "pharmacy_director",
    siteId: "2404",
    siteName: "RX Dallas OTC",
    region: "Southern – North Region",
  },

  // ── RX Fort Worth (2401) — Southern North ───────────────────────────────────
  "anna.galvan@aidshealth.org": {
    name: "Anna Galvan",
    role: "pharmacy_director",
    siteId: "2401",
    siteName: "RX Fort Worth",
    region: "Southern – North Region",
  },

  // ── RX Dallas Market Center (2409) — Southern North ─────────────────────────
  "ankit.parikh@aidshealth.org": {
    name: "Ankit Parikh",
    role: "pharmacy_director",
    siteId: "2409",
    siteName: "RX Dallas Market Center",
    region: "Southern – North Region",
  },

  // ── RX Houston OTC (2407) — Southern North ──────────────────────────────────
  "aruna.rajmohan@aidshealth.org": {
    name: "Aruna Rajmohan",
    role: "pharmacy_director",
    siteId: "2407",
    siteName: "RX Houston OTC",
    region: "Southern – North Region",
  },

  // ── RX Jackson (5507) — Southern North ──────────────────────────────────────
  "lashuta.johnson@aidshealth.org": {
    name: "LaShuta Johnson",
    role: "pharmacy_director",
    siteId: "5507",
    siteName: "RX Jackson",
    region: "Southern – North Region",
  },

  // ── RX Medical City (2400) — Southern North ─────────────────────────────────
  "saloumeh.esmaeil@aidshealth.org": {
    name: "Saloumeh Esmaeil",
    role: "pharmacy_director",
    siteId: "2400",
    siteName: "RX Medical City",
    region: "Southern – North Region",
  },

  // ── RX Peachtree (5417) — Southern North ────────────────────────────────────
  "stella.uche@aidshealth.org": {
    name: "Stella Uche",
    role: "pharmacy_director",
    siteId: "5417",
    siteName: "RX Peachtree",
    region: "Southern – North Region",
  },

  // ── RX Lithonia (5414) — Southern North ─────────────────────────────────────
  "gino.ruggeri@aidshealth.org": {
    name: "Gino Ruggeri",
    role: "pharmacy_director",
    siteId: "5414",
    siteName: "RX Lithonia",
    region: "Southern – North Region",
  },

  // ── RX Piedmont (5421) — Southern North ─────────────────────────────────────
  "clark.stuart@aidshealth.org": {
    name: "Clark Stuart",
    role: "pharmacy_director",
    siteId: "5421",
    siteName: "RX Piedmont",
    region: "Southern – North Region",
  },

  // ── RX Brooklyn (3404) — Northern ───────────────────────────────────────────
  "adaeze.akinsuanya@aidshealth.org": {
    name: "Adaeze Akinsuanya",
    role: "pharmacy_director",
    siteId: "3404",
    siteName: "RX Brooklyn",
    region: "Northern Region",
  },

  // ── RX Chicago OTC (3411) — Northern ────────────────────────────────────────
  "mack.parayo@aidshealth.org": {
    name: "Mack Parayo",
    role: "pharmacy_director",
    siteId: "3411",
    siteName: "RX Chicago OTC",
    region: "Northern Region",
  },

  // ── RX Baltimore (3410) — Northern ──────────────────────────────────────────
  "dominique.taylor@aidshealth.org": {
    name: "Dominique Taylor",
    role: "pharmacy_director",
    siteId: "3410",
    siteName: "RX Baltimore",
    region: "Northern Region",
  },
  "fishan.khalik@aidshealth.org": {
    name: "Fishan Khalik",
    role: "pharmacy_director",
    siteId: "3410",
    siteName: "RX Baltimore",
    region: "Northern Region",
  },

  // ── RX Columbus (2402) — Northern ───────────────────────────────────────────
  "nicholas.bailey@aidshealth.org": {
    name: "Nicholas Bailey",
    role: "pharmacy_director",
    siteId: "2402",
    siteName: "RX Columbus",
    region: "Northern Region",
  },

  // ── RX Cleveland (2405) — Northern ──────────────────────────────────────────
  "tarra.bryant@aidshealth.org": {
    name: "Tarra Bryant",
    role: "pharmacy_director",
    siteId: "2405",
    siteName: "RX Cleveland",
    region: "Northern Region",
  },

  // ── RX K-Street (4401) — Northern ───────────────────────────────────────────
  "cory.silva@aidshealth.org": {
    name: "Cory Silva",
    role: "pharmacy_director",
    siteId: "4401",
    siteName: "RX K-Street",
    region: "Northern Region",
  },

  // ── RX Capitol Hill (3414) — Northern ───────────────────────────────────────
  "shane.hodges@aidshealth.org": {
    name: "Shane Hodges",
    role: "pharmacy_director",
    siteId: "3414",
    siteName: "RX Capitol Hill",
    region: "Northern Region",
  },

  // ── RX Philadelphia (3409) — Northern ───────────────────────────────────────
  "tamara.applewhite@aidshealth.org": {
    name: "Tamara Applewhite",
    role: "pharmacy_director",
    siteId: "3409",
    siteName: "RX Philadelphia",
    region: "Northern Region",
  },

  // ── RX Manhattan (3407) — Northern ──────────────────────────────────────────
  "fareed.choudhry@aidshealth.org": {
    name: "Fareed Choudhry",
    role: "pharmacy_director",
    siteId: "3407",
    siteName: "RX Manhattan",
    region: "Northern Region",
  },

  // ── RX Queens (3406) — Northern ─────────────────────────────────────────────
  "lawrence.goldstein@aidshealth.org": {
    name: "Lawrence Goldstein",
    role: "pharmacy_director",
    siteId: "3406",
    siteName: "RX Queens",
    region: "Northern Region",
  },

  // ── Other staff ─────────────────────────────────────────────────────────────
  "roshanak.mohaghegh@ahfrx.org": {
    name: "Roshanak Mohaghegh",
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western Region",
    taskRoles: ["pharmacist_1"],
  },
  "roshanak.mohaghegh@aidshealth.org": {
    name: "Roshanak Mohaghegh",
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
};

const DEFAULT_PROFILE: Pick<UserProfile, "role" | "siteId" | "siteName"> = {
  role: "pharmacist_1",
  siteId: "1417",
  siteName: "RX Pike Street",
};

export function getUserProfile(email: string, name: string): UserProfile {
  const override = PROFILE_MAP[email.toLowerCase()];
  const base: UserProfile = { email, name, ...(override ?? DEFAULT_PROFILE) };

  // If this user has additionalSites, check for a stored site override (client-side only).
  if (base.additionalSites?.length) {
    try {
      const stored = (typeof localStorage !== "undefined")
        ? localStorage.getItem("koheez_active_site_override")
        : null;
      if (stored) {
        const found = base.additionalSites.find((s) => s.siteId === stored);
        if (found) return { ...base, siteId: found.siteId, siteName: found.siteName };
      }
    } catch {}
  }

  return base;
}

/**
 * True only when the email has an explicit entry in the profile map. Used by
 * Microsoft Teams SSO to deny sign-in for AHF accounts that are not provisioned
 * in the app (browser email/password login is unaffected by this).
 */
export function isKnownUser(email: string): boolean {
  return Object.prototype.hasOwnProperty.call(PROFILE_MAP, email.toLowerCase());
}

export function isDirectorRole(role: UserRole): boolean {
  return (
    role === "pharmacy_director" ||
    role === "regional_pharmacy_director" ||
    role === "chief_pharmacy_officer"
  );
}

export function isRegionalOrAbove(role: UserRole): boolean {
  return role === "regional_pharmacy_director" || role === "chief_pharmacy_officer";
}

export function isCPO(role: UserRole): boolean {
  return role === "chief_pharmacy_officer";
}

export function isPharmacyDirector(role: UserRole): boolean {
  return role === "pharmacy_director";
}

/**
 * Anyone licensed to dispense / sign for controlled substances.
 * Includes staff pharmacists and every level of pharmacy director.
 */
export function isPharmacist(role: UserRole): boolean {
  return (
    role === "pharmacist_1" ||
    role === "pharmacist_2" ||
    role === "pharmacy_director" ||
    role === "regional_pharmacy_director" ||
    role === "chief_pharmacy_officer"
  );
}

export function isTechRole(role: UserRole): boolean {
  return (
    role === "data_entry_tech" ||
    role === "pv2_tech" ||
    role === "delivery_tech" ||
    role === "pharmacist_1" ||
    role === "pharmacist_2"
  );
}

export function getAssignedRegion(profile: UserProfile): string | null {
  if (isCPO(profile.role)) return null;
  if (profile.role === "regional_pharmacy_director") return profile.region ?? null;
  return null;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    data_entry_tech: "Data Entry Tech",
    pv2_tech: "PV2 Tech",
    delivery_tech: "Delivery Tech",
    pharmacist_1: "Pharmacist 1",
    pharmacist_2: "Pharmacist 2",
    pharmacy_director: "Pharmacy Director",
    regional_pharmacy_director: "Regional Pharmacy Director",
    chief_pharmacy_officer: "Chief Pharmacy Officer",
  };
  return labels[role] ?? role;
}

export interface PersonRef {
  name: string;
  email: string;
}

export function getDirectorsByStore(siteId: string): PersonRef[] {
  return Object.entries(PROFILE_MAP)
    .filter(([, p]) => p.role === "pharmacy_director" && p.siteId === siteId)
    .map(([email, p]) => ({ name: p.name ?? email, email }));
}

export function getRPDsByRegion(region: string): PersonRef[] {
  return Object.entries(PROFILE_MAP)
    .filter(([, p]) => p.role === "regional_pharmacy_director" && p.region === region)
    .map(([email, p]) => ({ name: p.name ?? email, email }));
}

export function getCPOs(): PersonRef[] {
  return Object.entries(PROFILE_MAP)
    .filter(([, p]) => p.role === "chief_pharmacy_officer")
    .map(([email, p]) => ({ name: p.name ?? email, email }));
}

export interface StoreStaffMember extends PersonRef {
  role: UserRole;
}

/** Returns all named store-level staff (excludes RPDs and CPOs), ordered: directors → pharmacists → techs. */
export function getStoreStaff(siteId: string): StoreStaffMember[] {
  const roleOrder: Record<UserRole, number> = {
    chief_pharmacy_officer: 0,
    regional_pharmacy_director: 1,
    pharmacy_director: 2,
    pharmacist_2: 3,
    pharmacist_1: 4,
    data_entry_tech: 5,
    pv2_tech: 6,
    delivery_tech: 7,
  };
  return Object.entries(PROFILE_MAP)
    .filter(([, p]) =>
      p.siteId === siteId &&
      p.name &&
      p.role !== "regional_pharmacy_director" &&
      p.role !== "chief_pharmacy_officer"
    )
    .map(([email, p]) => ({ name: p.name!, email, role: p.role }))
    .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
}
