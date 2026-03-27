export type UserRole =
  | "data_entry_tech"
  | "pv2_tech"
  | "delivery_tech"
  | "pharmacist"
  | "director"
  | "regional_director";

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  siteId: string;
  siteName: string;
}

const PROFILE_MAP: Record<string, Pick<UserProfile, "role" | "siteId" | "siteName">> = {
  "test@koheez.ai": {
    role: "regional_director",
    siteId: "1417",
    siteName: "All Sites",
  },
  "jrockwoodpharmd@gmail.com": {
    role: "director",
    siteId: "1417",
    siteName: "Site 1417",
  },
};

const DEFAULT_PROFILE: Pick<UserProfile, "role" | "siteId" | "siteName"> = {
  role: "pharmacist",
  siteId: "1417",
  siteName: "Site 1417",
};

export function getUserProfile(email: string, name: string): UserProfile {
  const override = PROFILE_MAP[email.toLowerCase()];
  return { email, name, ...(override ?? DEFAULT_PROFILE) };
}

export function isDirectorRole(role: UserRole): boolean {
  return role === "director" || role === "regional_director";
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    data_entry_tech: "Data Entry Tech",
    pv2_tech: "PV2 Tech",
    delivery_tech: "Delivery Tech",
    pharmacist: "Pharmacist",
    director: "Site Director",
    regional_director: "Regional Director",
  };
  return labels[role] ?? role;
}
