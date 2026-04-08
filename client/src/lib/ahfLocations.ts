export interface AhfLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const AHF_LOCATIONS: AhfLocation[] = [
  { name: "AHF Healthcare Center - Antelope Valley", address: "1669 W Avenue J, Ste 301", city: "Lancaster", state: "CA", zip: "93534", phone: "(661) 723-3244" },
  { name: "AHF Healthcare Center - Carl Bean", address: "2146 W Adams Blvd", city: "Los Angeles", state: "CA", zip: "90018", phone: "(323) 766-2170" },
  { name: "AHF - Downtown Dental Office", address: "1414 S Grand Ave", city: "Los Angeles", state: "CA", zip: "90015", phone: "(213) 744-1752" },
  { name: "AHF Healthcare Center - K Street", address: "1701 K St NW, Suite 400", city: "Washington", state: "DC", zip: "20006", phone: "(202) 293-8680" },
  { name: "AHF - Broward Dental Clinic", address: "700 SE 3rd Ave, Suite 206", city: "Fort Lauderdale", state: "FL", zip: "33316", phone: "(954) 761-2230" },
  { name: "AHF Healthcare Center - Biscayne", address: "2400 Biscayne Blvd", city: "Miami", state: "FL", zip: "33137", phone: "(786) 522-2503" },
  { name: "AHF Healthcare Center - Coconut Grove", address: "3661 S Miami Ave, Ste 806", city: "Miami", state: "FL", zip: "33133", phone: "(786) 497-4000" },
  { name: "AHF Healthcare Center - AID Atlanta - Newnan", address: "770 Greison Trail, Suite H", city: "Newnan", state: "GA", zip: "30263", phone: "(770) 252-5418" },
  { name: "AHF Healthcare Center - Atlanta Midtown", address: "735 Piedmont Ave NE", city: "Atlanta", state: "GA", zip: "30308", phone: "(404) 588-4680" },
  { name: "AHF Healthcare Center - Auburn Ave", address: "659 Auburn Ave NE, Ste 156", city: "Atlanta", state: "GA", zip: "30312", phone: "(404) 888-0228" },
  { name: "AHF Healthcare Center - Chicago", address: "2600 S Michigan Ave, Ste 416", city: "Chicago", state: "IL", zip: "60616", phone: "(312) 881-3050" },
  { name: "AHF Healthcare Center - Chicago Hyde Park", address: "1515 E 52nd Place", city: "Chicago", state: "IL", zip: "60615", phone: "(312) 881-3050" },
  { name: "AHF Healthcare Center - Azmeh", address: "4890 Bluebonnet Blvd", city: "Baton Rouge", state: "LA", zip: "70809", phone: "(225) 769-3922" },
  { name: "AHF Healthcare Center - New Orleans", address: "2900 Magazine Street, 2nd Floor", city: "New Orleans", state: "LA", zip: "70115", phone: "(504) 208-2000" },
  { name: "AHF Healthcare Center - Baltimore", address: "2510 Saint Paul St, Fl 1", city: "Baltimore", state: "MD", zip: "21218", phone: "(410) 246-4876" },
  { name: "AHF Healthcare Center - Biloxi", address: "189 Walmart Lane, Suite B", city: "Biloxi", state: "MS", zip: "39531", phone: "(228) 207-2490" },
  { name: "AHF Healthcare Center - Las Vegas", address: "3201 S Maryland Pkwy, Ste 218", city: "Las Vegas", state: "NV", zip: "89109", phone: "(702) 862-8075" },
  { name: "AHF Healthcare Center - Bronx", address: "655 Morris Ave, Suite 2", city: "Bronx", state: "NY", zip: "10451", phone: "(347) 736-9046" },
  { name: "AHF Healthcare Center - Brooklyn", address: "475 Atlantic Ave, Ste 2", city: "Brooklyn", state: "NY", zip: "11217", phone: "(718) 369-4850" },
  { name: "AHF Healthcare Center - Chelsea", address: "365A W 28th St, 1st Fl", city: "New York", state: "NY", zip: "10001", phone: "(212) 741-3030" },
  { name: "AHF Healthcare Center - Cleveland", address: "2829 Euclid Ave", city: "Cleveland", state: "OH", zip: "44115", phone: "(216) 357-3131" },
  { name: "AHF Healthcare Center - Philadelphia", address: "1211 Chestnut St, Suite 405", city: "Philadelphia", state: "PA", zip: "19107", phone: "(215) 971-2804" },
  { name: "AHF Healthcare Center - Carolina", address: "Paseo del Prado, State Rd PR 3 KM 8.4, Suite 105", city: "Carolina", state: "PR", zip: "00983", phone: "(787) 300-3188" },
  { name: "AHF Healthcare Center - Columbia", address: "4100 N Main St, Suite 102", city: "Columbia", state: "SC", zip: "29203", phone: "(803) 223-9895" },
  { name: "AHF Healthcare Center - Austin", address: "2927 Guadalupe St", city: "Austin", state: "TX", zip: "78705", phone: "(512) 640-3100" },
  { name: "AHF Healthcare Center - Dallas", address: "7777 Forest Ln, Ste B-122", city: "Dallas", state: "TX", zip: "75230", phone: "(972) 383-1060" },
  { name: "AHF Healthcare Center - Houston", address: "1200 Binz St, Ste 1040", city: "Houston", state: "TX", zip: "77004", phone: "(713) 524-8700" },
  { name: "AHF Healthcare Center - Falls Church", address: "2946 Sleepy Hollow Rd, Suite 4B", city: "Falls Church", state: "VA", zip: "22044", phone: "(703) 962-1528" },
  { name: "AHF Healthcare Center - Seattle", address: "1016 E Pike St, Suite 200", city: "Seattle", state: "WA", zip: "98122", phone: "(206) 302-2020" },
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
