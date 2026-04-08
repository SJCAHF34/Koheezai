export interface AhfLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const AHF_LOCATIONS: AhfLocation[] = [
  // California
  { name: "AHF Pharmacy - Hollywood", address: "4905 Hollywood Blvd", city: "Los Angeles", state: "CA", zip: "90027", phone: "(323) 860-0173" },
  { name: "AHF Pharmacy - Vermont", address: "1300 N Vermont Ave, Ste 407", city: "Los Angeles", state: "CA", zip: "90027", phone: "(323) 661-0643" },
  { name: "AHF Pharmacy - Sunset", address: "6210 W Sunset Blvd", city: "Los Angeles", state: "CA", zip: "90028", phone: "(323) 860-0173" },
  { name: "AHF Pharmacy - West Hollywood", address: "8212 Santa Monica Blvd", city: "West Hollywood", state: "CA", zip: "90046", phone: "(323) 654-0907" },
  { name: "AHF Pharmacy - Silverlake", address: "1400 S Grand Ave, Ste 800", city: "Los Angeles", state: "CA", zip: "90015", phone: "(213) 741-5271" },
  { name: "AHF Pharmacy - Gardena", address: "18421 S Main St", city: "Gardena", state: "CA", zip: "90248", phone: "(310) 374-6284" },
  { name: "AHF Pharmacy - Vista", address: "1988 Hacienda Dr", city: "Vista", state: "CA", zip: "92081", phone: "(760) 295-2625" },
  // Washington D.C.
  { name: "AHF Pharmacy - Capitol Hill", address: "650 Pennsylvania Ave SE, Ste 380", city: "Washington", state: "DC", zip: "20003", phone: "" },
  // Florida
  { name: "AHF Pharmacy - Biscayne", address: "2400 Biscayne Blvd", city: "Miami", state: "FL", zip: "33137", phone: "(786) 522-2503" },
  { name: "AHF Pharmacy - Coconut Grove", address: "3661 S Miami Ave, Ste 806", city: "Miami", state: "FL", zip: "33133", phone: "(786) 497-4000" },
  { name: "AHF Pharmacy - Campus", address: "700 SE 3rd Ave, 1st Fl", city: "Fort Lauderdale", state: "FL", zip: "33316", phone: "(954) 761-4534" },
  // Georgia
  { name: "AHF Pharmacy - Ansley", address: "1512 Piedmont Ave NE", city: "Atlanta", state: "GA", zip: "30309", phone: "" },
  { name: "AHF Pharmacy - Auburn Ave", address: "659 Auburn Ave NE, Ste 156", city: "Atlanta", state: "GA", zip: "30312", phone: "(404) 888-0228" },
  { name: "AHF Pharmacy - Newnan", address: "770 Greison Trail, Suite H", city: "Newnan", state: "GA", zip: "30263", phone: "(678) 423-5250" },
  // Illinois
  { name: "AHF Pharmacy - Lakeview", address: "3311 N Halsted St", city: "Chicago", state: "IL", zip: "60657", phone: "(773) 435-9583" },
  { name: "AHF Pharmacy - Hyde Park", address: "1709 E 53rd St", city: "Chicago", state: "IL", zip: "60615", phone: "(773) 241-5950" },
  // Louisiana
  { name: "AHF Pharmacy - Baton Rouge", address: "4890 Bluebonnet Blvd", city: "Baton Rouge", state: "LA", zip: "70809", phone: "(225) 769-3922" },
  { name: "AHF Pharmacy - Cumberland", address: "8425 Cumberland Place", city: "New Orleans", state: "LA", zip: "70125", phone: "" },
  // Maryland
  { name: "AHF Pharmacy - Baltimore", address: "2510 Saint Paul St, Ste 1", city: "Baltimore", state: "MD", zip: "21218", phone: "(410) 246-4876" },
  // Mississippi
  { name: "AHF Pharmacy - Jackson", address: "766 Lakeland Drive, Suite A", city: "Jackson", state: "MS", zip: "39216", phone: "(601) 368-3442" },
  // Nevada
  { name: "AHF Pharmacy - Las Vegas", address: "3201 S Maryland Pkwy, Ste 218", city: "Las Vegas", state: "NV", zip: "89109", phone: "(702) 826-5310" },
  // New York
  { name: "AHF Pharmacy - Bronx", address: "655 Morris Ave, Suite 2", city: "Bronx", state: "NY", zip: "10451", phone: "(347) 736-9046" },
  { name: "AHF Pharmacy - Brooklyn", address: "475 Atlantic Ave", city: "Brooklyn", state: "NY", zip: "11217", phone: "(718) 369-4850" },
  { name: "AHF Pharmacy - City View", address: "23-07 Astoria Blvd", city: "Astoria", state: "NY", zip: "11102", phone: "" },
  // Ohio
  { name: "AHF Pharmacy - Cleveland", address: "2829 Euclid Ave", city: "Cleveland", state: "OH", zip: "44115", phone: "(216) 357-3131" },
  { name: "AHF Pharmacy - Columbus", address: "1230 N High St", city: "Columbus", state: "OH", zip: "43201", phone: "" },
  // Pennsylvania
  { name: "AHF Pharmacy - Philadelphia", address: "1211 Chestnut St, Ste 405", city: "Philadelphia", state: "PA", zip: "19107", phone: "(215) 971-2808" },
  // Puerto Rico
  { name: "AHF Pharmacy - Carolina", address: "State Rd PR 3 KM 8.4, Suite 107", city: "Carolina", state: "PR", zip: "00983", phone: "(787) 300-3188" },
  // South Carolina
  { name: "AHF Pharmacy - Columbia", address: "3025 Farrow Road", city: "Columbia", state: "SC", zip: "29203", phone: "" },
  // Texas
  { name: "AHF Pharmacy - Austin", address: "2927 Guadalupe St", city: "Austin", state: "TX", zip: "78705", phone: "(512) 640-3100" },
  { name: "AHF Pharmacy - Dallas", address: "3920 Cedar Springs Rd", city: "Dallas", state: "TX", zip: "75219", phone: "" },
  { name: "AHF Pharmacy - Dallas Market Center", address: "2600 N Stemmons Fwy, Suite 141A", city: "Dallas", state: "TX", zip: "75207", phone: "" },
  { name: "AHF Pharmacy - Houston Binz", address: "1200 Binz St, Suite 1040", city: "Houston", state: "TX", zip: "77004", phone: "(713) 520-2328" },
  { name: "AHF Pharmacy - Westheimer", address: "1435 Westheimer Rd", city: "Houston", state: "TX", zip: "77006", phone: "" },
  // Virginia
  { name: "AHF Pharmacy - Falls Church", address: "2946 Sleepy Hollow Rd, Suite 4B", city: "Falls Church", state: "VA", zip: "22044", phone: "" },
  // Washington
  { name: "AHF Pharmacy - Cabrini", address: "901 Boren Ave, Ste 800", city: "Seattle", state: "WA", zip: "98104", phone: "" },
];

export function findAhfLocations(state: string, city?: string): AhfLocation[] {
  const stateUpper = state.trim().toUpperCase();
  const matches = AHF_LOCATIONS.filter((loc) => loc.state === stateUpper);
  if (!city || !city.trim()) return matches;
  const cityLower = city.trim().toLowerCase();
  const cityMatches = matches.filter(
    (loc) =>
      loc.city.toLowerCase().includes(cityLower) ||
      cityLower.includes(loc.city.toLowerCase())
  );
  return cityMatches.length > 0 ? cityMatches : matches;
}

export const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "Washington D.C." },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "PR", name: "Puerto Rico" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];
