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

const PROFILE_MAP: Record<string, Pick<UserProfile, "role" | "siteId" | "siteName" | "region" | "taskRoles">> = {
  "cpo@koheez.ai": {
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },
  "cpo@aidshealth.org": {
    role: "chief_pharmacy_officer",
    siteId: "ALL",
    siteName: "All Regions",
    region: "all",
  },
  "regionaldirector@koheez.ai": {
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "regional@aidshealth.org": {
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "test@koheez.ai": {
    role: "regional_pharmacy_director",
    siteId: "1417",
    siteName: "Western Region",
    region: "Western Region",
  },
  "jrockwoodpharmd@gmail.com": {
    role: "pharmacy_director",
    siteId: "1417",
    siteName: "RX Pike Street",
  },
  "director@koheez.ai": {
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
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "pairiss.wilcox@aidshealth.org": {
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "anh.do@aidshealth.org": {
    role: "data_entry_tech",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["data_entry_tech"],
  },
  "debbie.nguyen@aidshealth.org": {
    role: "pharmacist_1",
    siteId: "1417",
    siteName: "RX Pike Street",
    region: "Western",
    taskRoles: ["pharmacist_1"],
  },
  "seth.collins@aidshealth.org": {
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
