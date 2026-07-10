export interface PharmacyDirectoryEntry {
  num: number;
  rxName: string;
  storeNum: number;
  director: string;
  address: string;
  phone: string;
  fax: string;
  hours: string;
}

export interface PharmacyDirectoryBureau {
  bureau: string;
  stores: PharmacyDirectoryEntry[];
}

export const PHARMACY_DIRECTORY: PharmacyDirectoryBureau[] = [
  {
    bureau: "Western Bureau",
    stores: [
      { num: 1, rxName: "P4H West CRC", storeNum: 8300, director: "Hannah Suh", address: "18421 S Main Street, Gardena, CA 90248", phone: "310-374-6284 x0", fax: "844-246-8543", hours: "24/7" },
      { num: 2, rxName: "Downtown", storeNum: 1402, director: "Albert Chen", address: "1400 S. Grand Ave., Ste 801, Los Angeles, CA 90015", phone: "213-741-5271", fax: "888-972-5391", hours: "M-F 8:30am-5:30pm" },
      { num: 3, rxName: "Long Beach", storeNum: 1407, director: "Eric Ascheri", address: "3500 E. Pacific Coast Hwy, Long Beach, CA 90804", phone: "562-494-4900", fax: "888-972-5389", hours: "M-Sat. 10am-7pm" },
      { num: 4, rxName: "Flagship San Diego", storeNum: 1415, director: "Savi Toma", address: "3580 5th Ave., Ste. 200, San Diego, CA 92103-5017", phone: "619-574-9700", fax: "888-972-6503", hours: "M-F 9am-7pm; Sat. 9am-5:30pm" },
      { num: 5, rxName: "Flagship Hollywood", storeNum: 1410, director: "Jason Rockwood", address: "4905 Hollywood Blvd., Los Angeles, CA 90027", phone: "323-860-0173", fax: "888-972-6498", hours: "M-Sat. 9am-7pm" },
      { num: 6, rxName: "Westside", storeNum: 1405, director: "Sam Badianat", address: "8641 Wilshire Blvd #200 Beverly Hills, CA 90211", phone: "310-854-2330", fax: "888-972-6504", hours: "M-F 8:30am-5:30pm" },
      { num: 7, rxName: "Valley", storeNum: 1404, director: "Samantha Kim", address: "4940 Van Nuys Blvd., Ste 200, Sherman Oaks, CA 91403", phone: "818-986-2643", fax: "888-972-6499", hours: "M-F 8:00am-6:00pm" },
      { num: 8, rxName: "P4H West Hollywood", storeNum: 8100, director: "Jordan Thompson", address: "8212 Santa Monica Blvd, West Hollywood, CA 90046", phone: "323-654-0907", fax: "888-972-6501", hours: "M-Sat. 9am-7pm" },
      { num: 9, rxName: "P4H East LA", storeNum: 8101, director: "Keyvan Shahriary", address: "5356 E. Whittier Blvd., Los Angeles, CA 90022", phone: "323-722-1010", fax: "888-972-5390", hours: "M-F 9am-7pm; Sat. 9am-5:30pm" },
      { num: 10, rxName: "Oakland", storeNum: 1409, director: "Ankit Parikh", address: "400 30th St., Ste 300, Oakland, CA 94609", phone: "510-628-0954", fax: "888-972-6505", hours: "M-F 8:30am-5:30pm; Lunch 12:30pm-1:30pm" },
      { num: 11, rxName: "CASTRO PHARMACY (NOT AHF PHARMACY)", storeNum: 1408, director: "Ryan Leung", address: "518-A Castro Street, San Francisco, CA 94114", phone: "415-255-2720", fax: "866-283-4863", hours: "M-F 9am-7pm; Closed Sat and Sun." },
      { num: 12, rxName: "P4H Cabrini", storeNum: 8115, director: "Elizabeth Camper", address: "901 Boren Ave., Ste. 800, Seattle, WA 98104", phone: "206-624-1391", fax: "855-500-5160", hours: "M-F 8:30am-5pm; Lunch 12:30pm-1:00pm" },
      { num: 13, rxName: "Pike St.", storeNum: 1417, director: "Seth Collins", address: "1016 E. Pike St., Ste 100, Seattle, WA 98122", phone: "206-302-2045", fax: "844-965-9393", hours: "M-Sat 10am-7:00pm; Sat Lunch 2pm-3pm" },
      { num: 14, rxName: "Las Vegas", storeNum: 1423, director: "Juan Piedra Flores", address: "3201 S. Maryland Pkwy, Ste 218, Las Vegas, NV 89109", phone: "702-826-5310", fax: "844-602-4600", hours: "M,W-F 8:30am-5:30pm; Tues 10:00am-7:00pm" },
      { num: 15, rxName: "P4H Hillcrest", storeNum: 8103, director: "Kaylene De Vries", address: "120 University Ave, San Diego, CA 92103-3007", phone: "619-260-1010", fax: "833-564-0436", hours: "M-F 8am-6pm, Sat 10am-2pm, Closed Sunday" },
      { num: 16, rxName: "P4H Vista", storeNum: 8102, director: "Walid Mohammad", address: "1988 Hacienda Drive, Vista, CA 92081-6026", phone: "760-295-2625", fax: "833-564-0437", hours: "M-F 9am-5:30pm; Closed Saturday & Sunday" },
      { num: 17, rxName: "Mi Farmacia", storeNum: 8105, director: "Citlalic Chavira", address: "4630 Border Village Rd. Suite K, San Ysidro, CA 92173-3117", phone: "619-428-3760", fax: "833-469-1078", hours: "M-F 9:00am-5:30pm; Closed Saturday & Sunday" },
    ],
  },
  {
    bureau: "Southern Bureau",
    stores: [
      { num: 18, rxName: "Lithonia", storeNum: 5414, director: "Gina Ruggeri", address: "5700 Hillandale Dr., Ste. 100, Lithonia, GA 30058", phone: "770-808-3705", fax: "855-685-1305", hours: "M-F 8:00am-6:00pm Lunch 1pm-2pm" },
      { num: 19, rxName: "Newnan", storeNum: 5418, director: "Dominique Taylor", address: "770 Greison Trail, Ste. H, Newnan, GA 30263", phone: "678-423-5250", fax: "855-667-1581", hours: "M, W, Th, F 8am-5pm, Lunch 12pm-1pm; Tue 9am-6pm, Lunch 1pm-2pm" },
      { num: 20, rxName: "Peachtree", storeNum: 5417, director: "Stella Uche", address: "1438 W Peachtree NW, Ste. 134, Atlanta, GA 30309", phone: "404-879-3990", fax: "855-696-1385", hours: "M-F 8:30am-6:30pm Lunch 1pm-1:30pm" },
      { num: 21, rxName: "Auburn Avenue", storeNum: 5419, director: "Chandra Garner", address: "659 Auburn Ave NE Ste 156, Atlanta, GA 30312-1976", phone: "470-447-6471", fax: "855-694-8272", hours: "Mon 8:00am-5:30pm; T 9:00am-4:30pm; W, Th, F 8:00am-4:30pm, Lunch 1:00PM-1:30PM" },
      { num: 22, rxName: "Piedmont", storeNum: 5421, director: "David Clark Staurt", address: "735 Piedmont Ave NE, Atlanta, GA 30308", phone: "470-639-6592", fax: "866-571-1419", hours: "M-F 8:30am-6:30pm; Lunch 1pm-2pm" },
      { num: 23, rxName: "Columbia", storeNum: 2403, director: "Whitney Williams", address: "3025 Farrow Rd., Columbia, SC 29203", phone: "803-509-5676", fax: "877-349-0181", hours: "M-F 8am-5pm; Lunch: 1:30pm-2pm" },
      { num: 24, rxName: "Baton Rouge", storeNum: 5501, director: "Simone Mack", address: "4890 Bluebonnet Blvd., Baton Rouge, LA 70809", phone: "225-297-4430", fax: "855-694-8363", hours: "M-F 8:30am-5pm" },
      { num: 25, rxName: "Cumberland", storeNum: 5511, director: "Bobbi Crouch", address: "8425 Cumberland Place, Baton Rouge, LA 70806", phone: "225-297-4435", fax: "866-812-8774", hours: "M-F 8am-4:30pm; Lunch 12-12:30" },
      { num: 26, rxName: "Jackson", storeNum: 5507, director: "LaQuita Johnson", address: "766 Lakeland Dr., Ste A, Jackson, MS 39216-4610", phone: "601-368-3442", fax: "833-283-7487", hours: "M-F 8am-5pm; Lunch 12-1" },
      { num: 27, rxName: "Fort Worth", storeNum: 2401, director: "Anna Galvan", address: "400 N. Beach St., Ste 102, Ft. Worth, TX 76111", phone: "817-831-1814", fax: "877-489-6044", hours: "M-F 8:30am-5:30pm" },
      { num: 28, rxName: "P4H Dallas", storeNum: 8114, director: "Gregory Matuszewski", address: "3920 Cedar Springs Rd., Dallas, TX 75219", phone: "214-599-7020", fax: "888-972-6502", hours: "M-S 10am-7pm" },
      { num: 29, rxName: "Medical City", storeNum: 2400, director: "Saloumeh \"Sally\" Esmaeili", address: "7777 Forest Lane, STE B-A80, Dallas, TX 75230-2571", phone: "972-383-1070", fax: "844-608-1633", hours: "M-F 8:30am-6pm" },
      { num: 30, rxName: "Binz", storeNum: 2408, director: "Trisha Patel", address: "1200 Binz St., Ste 1040, Houston, TX 77004-6937", phone: "713-520-2328", fax: "844-608-1631", hours: "M-F 8:30am-5:00pm" },
      { num: 31, rxName: "P4H Houston", storeNum: 8113, director: "Aruna Rajmohan", address: "1435 Westheimer Rd., Houston, TX 77006-2616", phone: "713-391-8991", fax: "833-980-0318", hours: "M-Sat. 10am - 7pm" },
      { num: 32, rxName: "P4H Ansley", storeNum: 8104, director: "Corey Woodward", address: "1512 Piedmont Ave NE, Atlanta, GA 30324", phone: "470-447-6480", fax: "866-488-0686", hours: "M-Sat 10am-7pm" },
      { num: 33, rxName: "Austin", storeNum: 2410, director: "Rika Charme", address: "2927 Guadalupe Street, Austin, TX 78705", phone: "512-640-1110", fax: "855-896-8605", hours: "M-F 9am-6pm Lunch 1-2" },
      { num: 34, rxName: "Dallas Market Center", storeNum: 2409, director: "Hiram Juarbe Torres", address: "2600 N Stemmons Fwy Ste 141-A, Dallas, TX 75207-2113", phone: "972-584-9653", fax: "833-897-3812", hours: "M-F 8am - 5pm; Lunch: 12pm-1pm" },
    ],
  },
  {
    bureau: "Southern Bureau - South",
    stores: [
      { num: 35, rxName: "P4H FL CRC", storeNum: 8250, director: "Rana Korkis", address: "700 SE 3rd Ave., Ste 100, Ft. Lauderdale, FL 33316", phone: "954-761-4533", fax: "954-761-4539", hours: "M-F 6am-10:30pm. (Doesn't close) Sat 6am-2:30pm, Sun. closed" },
      { num: 36, rxName: "Biscayne", storeNum: 5410, director: "Adrian Velazquez", address: "2400 Biscayne Blvd., Miami, FL 33137-4516", phone: "305-764-3780", fax: "877-533-8339", hours: "M-Sat. 10am-7pm (9-7) Closed Sun." },
      { num: 37, rxName: "Coconut Grove", storeNum: 5413, director: "Zachary Kushner", address: "3661 S. Miami Ave., Ste. 806, Miami, FL 33133", phone: "305-860-5509", fax: "855-556-0453", hours: "M-F 8:30am-5pm; Lunch 12:30pm-1pm" },
      { num: 38, rxName: "North Miami Beach", storeNum: 5409, director: "Vanessa Dorce", address: "101 NW 167 Street, North Miami Beach, FL 33169", phone: "305-758-1984", fax: "855-562-6970", hours: "M-F 8:30am-5:30pm; Lunch 12:00pm-1:00pm" },
      { num: 39, rxName: "North Point", storeNum: 5401, director: "Sean Williams", address: "6333 N Federal Hwy, Ste 301, Ft Lauderdale, FL 33308-1907", phone: "954-727-2174", fax: "877-533-8553", hours: "M,T,Th,F 8:30am-5:30pm, W 8:30am-7:00pm" },
      { num: 40, rxName: "P4H Sunrise", storeNum: 8107, director: "LaQuesha Moore", address: "1785 E. Sunrise Blvd., Ft. Lauderdale, FL 33304", phone: "954-462-9223", fax: "877-533-8966", hours: "M-Sat. 10am-7pm" },
      { num: 41, rxName: "P4H Wilton Manors", storeNum: 8108, director: "Lynette Price", address: "2097 Wilton Dr., Wilton Manors, FL 33305", phone: "954-318-6997", fax: "888-974-4249", hours: "M-Sat. 10am-7pm Closed Sun." },
      { num: 42, rxName: "South Beach", storeNum: 5412, director: "Carlos Palacios", address: "4308 Alton Road, Ste. 870, Miami Beach, FL 33140", phone: "305-538-5914", fax: "877-533-8999", hours: "M, Tue, W, F: 8:30am-6pm; Thu: 8:30am-7pm" },
      { num: 43, rxName: "Oakland Park", storeNum: 5416, director: "Maksim Yermakov", address: "2866 E. Oakland Park Boulevard, Ste 2, Fort Lauderdale, FL 33306", phone: "954-566-2745", fax: "855-553-6926", hours: "M,T,Th,F 8am-5pm, W 8am-7pm; Lunch 12:00-1:00" },
      { num: 44, rxName: "Delray Beach", storeNum: 5420, director: "Benjamin Levy", address: "200 Congress Park Dr., Ste. 210, Delray Beach, FL 33445", phone: "561-274-2655", fax: "844-232-1108", hours: "M,T 8:30-7; W, Th 8:30-5; Lunch 1-2 & F 9-3 Lunch 1-1:30" },
      { num: 45, rxName: "Campus", storeNum: 5506, director: "Analia Martin", address: "700 SE 3rd Ave., Ste 100A, Ft. Lauderdale, FL 33316", phone: "954-761-4534", fax: "844-448-5483", hours: "M,T,Th,F 8:30am-5:30pm, W 8:30am-7:00pm, no lunch" },
      { num: 46, rxName: "Carolina", storeNum: 5505, director: "Daniel Menendez-Sanabria", address: "Paseo Del Prado Shopping Center Suite 107, PR-3 KM 8.4, Carolina, Puerto Rico, 00987 (FedEx & UPS Only); PO Box 340, St Just Station, Trujillo Alto, PR 00978 (USPS)", phone: "(787) 300-3188", fax: "888-965-3974", hours: "M 9:00am-6:00pm, Tues-Fri 7:00am-4:00pm; Mon Lunch: 1pm-2pm; Tues-Fri Lunch: 11:20am-12:20pm" },
      { num: 47, rxName: "West Palm Beach", storeNum: 3412, director: "Anthony Pierre", address: "1411 N. Flagler Dr., STE 9300, West Palm Beach, FL 33401", phone: "561-284-8185", fax: "855-756-8570", hours: "Mon, Tues, Thurs 8:00am-5:00pm; Wed 8:00am-7:00pm; Fri 8:00am-3:00pm Closed for Lunch 1-1:30pm" },
      { num: 48, rxName: "Orlando", storeNum: 5405, director: "Lonnie Strom", address: "707 E Colonial Drive, Orlando, FL 32803", phone: "407-770-0507", fax: "833-687-1682", hours: "M-F 8:00am-5:00pm" },
      { num: 49, rxName: "Safety Harbor", storeNum: 5406, director: "Amanda Haddad", address: "3135 SR 580, Ste. 1, Safety Harbor, FL 34695", phone: "727-259-2000", fax: "844-587-9596", hours: "M-F 8:00am-5:00pm" },
      { num: 50, rxName: "St. Petersburg", storeNum: 5504, director: "Lisa Roma", address: "3400 26th Avenue South, St. Petersburg, FL 33711", phone: "727-321-1135", fax: "855-823-7566", hours: "M-Sat 10am-7pm" },
      { num: 51, rxName: "P4H Orlando OTC", storeNum: 8106, director: "Jonathan Rares", address: "1349 N Mills Ave., Orlando, FL 32803", phone: "407-583-4926", fax: "833-268-8389", hours: "M-Sat 10am-7pm" },
      { num: 52, rxName: "Fort Myers", storeNum: 5423, director: "Shadreka McIntosh", address: "2320 Cleveland Ave, Fort Myers, FL 33901", phone: "239-210-9985", fax: "877-868-1412", hours: "8-5pm lunch from 12-1pm M, T, W, F, except for Thursday which are 10-7pm with lunch from 2-3pm" },
      { num: 53, rxName: "Jacksonville", storeNum: 5402, director: "Ryan Ford (Interim)", address: "2 Shircliff Way, Ste. 900, Jacksonville, FL 32204", phone: "904-389-9744", fax: "888-974-6457", hours: "M-F 8:00am-5:00pm" },
      { num: 54, rxName: "Pensacola", storeNum: 5408, director: "Kristen Stokes", address: "4300 Bayou Blvd., Ste. 17D, Pensacola, FL 32503", phone: "850-472-0962", fax: "866-284-9005", hours: "M-F 8am-5pm; Lunch 12pm-1pm" },
      { num: 55, rxName: "Hollywood FLORIDA", storeNum: 5510, director: "Mary Steckbeck", address: "3800 Johnson Street, Ste F, Hollywood, FL 33021", phone: "954-745-8345", fax: "833-856-7287", hours: "Mon, Tues, Wed, Fri 8am-5pm, Lunch 12-1; Thurs 10am-7pm, Lunch 2-3" },
    ],
  },
  {
    bureau: "Northeast Bureau",
    stores: [
      { num: 56, rxName: "P4H Farmingdale", storeNum: 8111, director: "Evangelia Katsamanis", address: "619 Main St., Farmingdale, NY 11735", phone: "631-547-6520", fax: "877-533-6820", hours: "M-F 8:30am-5:30pm" },
      { num: 57, rxName: "Brooklyn", storeNum: 3404, director: "Adesayo Akinsanya", address: "475 Atlantic Ave., 1st Fl., Brooklyn, NY 11217", phone: "718-637-2970", fax: "877-533-6822", hours: "M-Sat. 10am-7pm Closed Sun." },
      { num: 58, rxName: "Manhattan", storeNum: 3407, director: "Fareed Choudhry", address: "352 7th Ave, Rm 1206, New York, NY 10001-5012", phone: "212-284-0060", fax: "844-693-1406", hours: "M-F 8:30am-6:30pm" },
      { num: 59, rxName: "Cleveland", storeNum: 2405, director: "Tarra Bryant", address: "2829 Euclid Ave., Cleveland, OH 44115", phone: "216-357-3327", fax: "877-533-7801", hours: "M-F 8:30am-5:30pm; Closed Lunch 12pm-1pm" },
      { num: 60, rxName: "P4H Columbus", storeNum: 8112, director: "Nicholas (Nick) Adam Bailey", address: "1230 N. High Street, Columbus, OH 43201", phone: "614-291-2670", fax: "877-533-8281", hours: "M-S 10am-7pm; Closed Sun." },
      { num: 61, rxName: "Queens", storeNum: 3406, director: "Lawrence Goldstein", address: "91-30 Van Wyck Expressway, Jamaica, NY 11418", phone: "929-421-4620", fax: "844-608-1627", hours: "M-F 8:30am-5:30pm; Lunch 12:30pm-1:30pm" },
      { num: 62, rxName: "K Street", storeNum: 4401, director: "Cory Silva", address: "1701 K Street, NW, Ste. 400, Washington, DC 20006", phone: "202-293-8695", fax: "888-975-2980", hours: "M,T,W,F 8:30am-5:30pm-Lunch 12:00pm-1:00pm, TH 8:30am-6:30pm - Lunch 1:00pm - 2:00pm" },
      { num: 63, rxName: "Capitol Hill", storeNum: 3414, director: "Shane Hodges", address: "650 Pennsylvania Ave. SE, Ste. 380, Washington DC 20003", phone: "202-350-5005", fax: "833-605-4068", hours: "Mon-Fri 8:30am-5:30pm-Lunch 12:00pm-1:00pm" },
      { num: 64, rxName: "P4H City View", storeNum: 8110, director: "Harry Xidias", address: "23-07 Astoria Blvd., Astoria, NY 11102-2598", phone: "718-545-2550", fax: "877-533-8301", hours: "M-F 9am-6pm" },
      { num: 65, rxName: "Philadelphia", storeNum: 3409, director: "Tamara Appalsammy", address: "1211 Chestnut St., Ste 405, Philadelphia, PA 19107", phone: "215-971-2808", fax: "855-747-1706", hours: "M-F 8am-5pm; Lunch 12:30pm-1:30pm" },
      { num: 66, rxName: "Chicago", storeNum: 3411, director: "Mack-Anthony Parayo", address: "3311 N. Halsted St., Chicago, IL 60657-2412", phone: "773-435-9583", fax: "844-587-9598", hours: "M-Sat 10am-7pm" },
      { num: 67, rxName: "Hyde Park", storeNum: 3416, director: "Divya Patel- Interim", address: "1709 E 53rd Street, Chicago, IL 60615", phone: "773-241-5950", fax: "833-329-3724", hours: "M-Sat 10am-7pm" },
      { num: 68, rxName: "Baltimore", storeNum: 3410, director: "Rahan Khalik", address: "2510 Saint Paul St. Ste. 1, Baltimore, MD 21218", phone: "410-246-4877", fax: "833-867-3017", hours: "M,W,Th,F 8:30am-5:30pm-Lunch 12:00pm-1:00pm, Tu 10:00am-7:00pm - Lunch 2:00pm - 3:00pm" },
      { num: 69, rxName: "Bronx", storeNum: 3413, director: "Ami Shah", address: "655 Morris Ave., #2, Bronx, NY 10451-4898", phone: "347-736-9047", fax: "855-708-4716", hours: "Mon-Fri 8:00 am - 6:00 pm" },
    ],
  },
];
