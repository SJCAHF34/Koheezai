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
}

type ProfileEntry = Pick<UserProfile, "role" | "siteId" | "siteName" | "region" | "taskRoles"> & { name?: string };

const PROFILE_MAP: Record<string, ProfileEntry> = {
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
  "jeremy.zeller@aidshealth.org": {
    name: "Jeremy Zeller",
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },
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
  "jrockwoodpharmd@gmail.com": {
    name: "Jason Rockwood",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
  },
  "director@koheez.ai": {
    name: "Pharmacy Director",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
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
  "claire.wood@aidshealth.org": {
    name: "Claire Wood",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "pairiss.wilcox@aidshealth.org": {
    name: "Pairiss Wilcox",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "anh.do@aidshealth.org": {
    name: "Anh Do",
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "debbie.nguyen@aidshealth.org": {
    name: "Debbie Nguyen",
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["pharmacist_1"],
  },
  "seth.collins@aidshealth.org": {
    name: "Seth Collins",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
  },
  "walid.mohammad@aidshealth.org": {
    name: "Walid Mohammad",
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
  },
  "elizabeth.camper@aidshealth.org": {
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["pharmacist_1"],
  },
  "uyen-vy.nguyen@aidshealth.org": {
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["pharmacist_1"],
  },
  "bobby.couch@aidshealth.org": {
    name: "Bobby Couch",
    role: "pharmacy_director",
    siteId: "5511",
    siteName: "RX Cumberland",
    region: "Southern – North Region",
  },
};

const DEFAULT_PROFILE: Pick<UserProfile, "role" | "siteId" | "siteName"> = {
  role: "pharmacist_1",
  siteId: "1417",
  siteName: "RX Pike Street",
};

export function getUserProfile(email: string, name: string): UserProfile {
  const override = PROFILE_MAP[email.toLowerCase()];
  return { email, name, ...(override ?? DEFAULT_PROFILE) };
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
