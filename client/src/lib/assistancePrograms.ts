export type ProgramType = "pap" | "copay" | "adap" | "foundation" | "manufacturer";

export type AssistanceProgram = {
  name: string;
  type: ProgramType;
  description: string;
  eligibility: string;
  savings?: string;
  phone?: string;
  website: string;
  needymedsUrl?: string;
};

export type DrugAssistanceEntry = {
  brandName: string;
  genericName: string;
  drugIds: string[];
  manufacturer: string;
  programs: AssistanceProgram[];
};

export const drugAssistanceData: DrugAssistanceEntry[] = [
  // ─── GILEAD MEDICATIONS ───────────────────────────────────────────
  {
    brandName: "Biktarvy",
    genericName: "Bictegravir/Emtricitabine/Tenofovir AF",
    drugIds: ["biktarvy", "bictegravir"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Reduces or eliminates out-of-pocket copay costs for commercially insured patients. Patients may pay as little as $0/month.",
        eligibility: "Commercial/private insurance only. Not valid for Medicare, Medicaid, TRICARE, or VA.",
        savings: "Up to $7,200/year with no monthly limit",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Biktarvy",
      },
      {
        name: "Gilead Advancing Access® Patient Assistance (PAP)",
        type: "pap",
        description: "Free medication for uninsured or underinsured patients who meet income requirements.",
        eligibility: "Uninsured or underinsured. Income up to 500% of Federal Poverty Level.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Biktarvy",
      },
    ],
  },
  {
    brandName: "Descovy",
    genericName: "Emtricitabine/Tenofovir AF",
    drugIds: ["descovy"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured patients prescribed Descovy for HIV treatment or PrEP.",
        eligibility: "Commercial/private insurance only. Not valid for Medicare, Medicaid, TRICARE, or VA.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Descovy",
      },
      {
        name: "Gilead Advancing Access® Patient Assistance (PAP)",
        type: "pap",
        description: "Free Descovy for uninsured or underinsured patients meeting income criteria.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Descovy",
      },
    ],
  },
  {
    brandName: "Genvoya",
    genericName: "Elvitegravir/Cobicistat/Emtricitabine/TAF",
    drugIds: ["genvoya"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Reduces copay for commercially insured Genvoya patients to as low as $0/month.",
        eligibility: "Commercial/private insurance. Not valid for government insurance programs.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Genvoya",
      },
      {
        name: "Gilead Advancing Access® PAP",
        type: "pap",
        description: "Free Genvoya for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Genvoya",
      },
    ],
  },
  {
    brandName: "Odefsey",
    genericName: "Rilpivirine/Emtricitabine/TAF",
    drugIds: ["odefsey"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Odefsey patients.",
        eligibility: "Commercial/private insurance. Excludes government-funded coverage.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Odefsey",
      },
      {
        name: "Gilead Advancing Access® PAP",
        type: "pap",
        description: "Free Odefsey for uninsured or underinsured qualifying patients.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Odefsey",
      },
    ],
  },
  {
    brandName: "Complera",
    genericName: "Rilpivirine/Emtricitabine/TDF",
    drugIds: ["complera"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Complera patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Complera",
      },
      {
        name: "Gilead Advancing Access® PAP",
        type: "pap",
        description: "Free Complera for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Complera",
      },
    ],
  },
  {
    brandName: "Truvada",
    genericName: "Emtricitabine/Tenofovir DF",
    drugIds: ["truvada"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Truvada patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Truvada",
      },
      {
        name: "Gilead Advancing Access® PAP",
        type: "pap",
        description: "Free Truvada for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Truvada",
      },
    ],
  },
  {
    brandName: "Stribild",
    genericName: "Elvitegravir/Cobicistat/Emtricitabine/TDF",
    drugIds: ["stribild"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Stribild patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Stribild",
      },
    ],
  },
  {
    brandName: "Atripla",
    genericName: "Efavirenz/Emtricitabine/TDF",
    drugIds: ["atripla"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Atripla patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Atripla",
      },
    ],
  },
  {
    brandName: "Sunlenca",
    genericName: "Lenacapavir",
    drugIds: ["lenacapavir"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings (Sunlenca)",
        type: "copay",
        description: "Separate enrollment required for Sunlenca. Reduces copay for commercially insured patients to as low as $0.",
        eligibility: "Commercial/private insurance only. Requires separate Sunlenca enrollment.",
        savings: "Up to $9,600/year with no monthly limit",
        phone: "1-800-226-2056",
        website: "https://www.sunlenca.com/support",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Sunlenca",
      },
      {
        name: "Gilead Advancing Access® PAP (Sunlenca)",
        type: "pap",
        description: "Free Sunlenca for uninsured or underinsured patients meeting income requirements.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.sunlenca.com/support",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Sunlenca",
      },
    ],
  },
  {
    brandName: "Viread",
    genericName: "Tenofovir DF",
    drugIds: ["tenofovir_df"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Viread patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Viread",
      },
    ],
  },
  {
    brandName: "Vemlidy",
    genericName: "Tenofovir AF",
    drugIds: ["tenofovir_af"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® Co-pay Savings",
        type: "copay",
        description: "Copay assistance for commercially insured Vemlidy patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,200/year",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/copay-coupon-card",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Vemlidy",
      },
    ],
  },
  {
    brandName: "Emtriva",
    genericName: "Emtricitabine",
    drugIds: ["emtricitabine"],
    manufacturer: "Gilead Sciences",
    programs: [
      {
        name: "Gilead Advancing Access® PAP",
        type: "pap",
        description: "Free Emtriva for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured. Income up to 500% FPL.",
        savings: "Free medication",
        phone: "1-800-226-2056",
        website: "https://www.gileadadvancingaccess.com/patient",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Emtriva",
      },
    ],
  },

  // ─── VIIV HEALTHCARE MEDICATIONS ──────────────────────────────────
  {
    brandName: "Triumeq",
    genericName: "Dolutegravir/Abacavir/Lamivudine",
    drugIds: ["triumeq"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Helps commercially insured patients reduce their out-of-pocket Triumeq costs to as low as $0/month.",
        eligibility: "Commercial/private insurance. Not valid for Medicare, Medicaid, or other government programs.",
        savings: "Up to $9,600/year",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Triumeq",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Triumeq for uninsured or underinsured patients who meet income and residency requirements.",
        eligibility: "Uninsured or underinsured US residents. Income requirements apply.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/prescription-medicine-patient-assistance/triumeq/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Triumeq",
      },
    ],
  },
  {
    brandName: "Dovato",
    genericName: "Dolutegravir/Lamivudine",
    drugIds: ["dovato"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Reduces Dovato copay for commercially insured patients to as low as $0/month.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $9,600/year",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Dovato",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Dovato for uninsured or underinsured patients meeting income requirements.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/prescription-medicine-patient-assistance/dovato/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Dovato",
      },
    ],
  },
  {
    brandName: "Cabenuva",
    genericName: "Cabotegravir/Rilpivirine (Injectable)",
    drugIds: ["cabenuva", "cabotegravir"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance – Cabenuva",
        type: "copay",
        description: "Copay support for commercially insured patients receiving long-acting injectable Cabenuva. Up to 9 out of 10 patients pay less than $10 out-of-pocket per dose.",
        eligibility: "Commercial/private insurance. Not valid for Medicare, Medicaid, or government programs.",
        savings: "Up to $13,000/year; most patients pay <$10 per dose",
        phone: "1-844-588-3288",
        website: "https://www.cabenuva.com/savings-and-support/cabenuva-support/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Cabenuva",
      },
      {
        name: "GSK PAP – Cabenuva",
        type: "pap",
        description: "Free Cabenuva for uninsured or underinsured patients who meet program requirements.",
        eligibility: "Uninsured or underinsured US residents. Income requirements apply.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/prescription-medicine-patient-assistance/cabenuva/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Cabenuva",
      },
    ],
  },
  {
    brandName: "Juluca",
    genericName: "Dolutegravir/Rilpivirine",
    drugIds: ["juluca"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Copay assistance for commercially insured Juluca patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $9,600/year",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Juluca",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Juluca for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Juluca",
      },
    ],
  },
  {
    brandName: "Tivicay",
    genericName: "Dolutegravir",
    drugIds: ["dolutegravir"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Copay assistance for commercially insured Tivicay patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $9,600/year",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Tivicay",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Tivicay for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Tivicay",
      },
    ],
  },
  {
    brandName: "Epivir",
    genericName: "Lamivudine",
    drugIds: ["lamivudine"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Copay assistance for commercially insured Epivir patients.",
        eligibility: "Commercial/private insurance only.",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Epivir",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Epivir for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Epivir",
      },
    ],
  },
  {
    brandName: "Ziagen",
    genericName: "Abacavir",
    drugIds: ["abacavir"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Copay assistance for commercially insured Ziagen patients.",
        eligibility: "Commercial/private insurance only.",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Ziagen",
      },
      {
        name: "GSK Patient Assistance Program (PAP)",
        type: "pap",
        description: "Free Ziagen for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Ziagen",
      },
    ],
  },
  {
    brandName: "Rukobia",
    genericName: "Fostemsavir",
    drugIds: ["fostemsavir"],
    manufacturer: "ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance – Rukobia",
        type: "copay",
        description: "Copay support for commercially insured patients on Rukobia (heavily treatment-experienced).",
        eligibility: "Commercial/private insurance only.",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Rukobia",
      },
      {
        name: "GSK Patient Assistance Program (PAP) – Rukobia",
        type: "pap",
        description: "Free Rukobia for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-844-588-3288",
        website: "https://gskpaf.org/viiv/",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Rukobia",
      },
    ],
  },

  // ─── JANSSEN / JOHNSON & JOHNSON ──────────────────────────────────
  {
    brandName: "Symtuza",
    genericName: "Darunavir/Cobicistat/Emtricitabine/TAF",
    drugIds: ["symtuza"],
    manufacturer: "Janssen (J&J)",
    programs: [
      {
        name: "Janssen CarePath Savings Program",
        type: "copay",
        description: "Reduces copay for commercially insured Symtuza patients to as low as $0/month.",
        eligibility: "Commercial/private insurance. Not valid if coverage is through a government program.",
        savings: "Up to $12,500/year",
        phone: "1-877-227-3728",
        website: "https://www.janssencarepath.com/patient/symtuza",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Symtuza",
      },
      {
        name: "Janssen Patient Assistance Program",
        type: "pap",
        description: "Free Symtuza for uninsured or underinsured patients meeting income requirements.",
        eligibility: "Uninsured or underinsured US residents meeting income criteria.",
        savings: "Free medication",
        phone: "1-800-652-6227",
        website: "https://www.janssencarepath.com/patient/symtuza",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Symtuza",
      },
    ],
  },
  {
    brandName: "Prezista",
    genericName: "Darunavir",
    drugIds: ["darunavir"],
    manufacturer: "Janssen (J&J)",
    programs: [
      {
        name: "Janssen CarePath Savings Program",
        type: "copay",
        description: "Copay savings for commercially insured Prezista patients.",
        eligibility: "Commercial/private insurance. Not valid for government-funded coverage.",
        savings: "Up to $7,500/year",
        phone: "1-877-227-3728",
        website: "https://www.janssencarepath.com/patient/prezista",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Prezista",
      },
      {
        name: "Janssen Patient Assistance Program",
        type: "pap",
        description: "Free Prezista for uninsured or underinsured patients who qualify.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-800-652-6227",
        website: "https://www.janssencarepath.com/patient/prezista",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Prezista",
      },
    ],
  },
  {
    brandName: "Edurant",
    genericName: "Rilpivirine",
    drugIds: ["rilpivirine"],
    manufacturer: "Janssen (J&J)",
    programs: [
      {
        name: "Janssen CarePath Savings Program",
        type: "copay",
        description: "Copay savings for commercially insured Edurant patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,500/year",
        phone: "1-877-227-3728",
        website: "https://www.janssencarepath.com/patient/edurant",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Edurant",
      },
      {
        name: "Janssen Patient Assistance Program",
        type: "pap",
        description: "Free Edurant for uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-800-652-6227",
        website: "https://www.janssencarepath.com/patient/edurant",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Edurant",
      },
    ],
  },
  {
    brandName: "Intelence",
    genericName: "Etravirine",
    drugIds: ["etravirine"],
    manufacturer: "Janssen (J&J)",
    programs: [
      {
        name: "Janssen CarePath Savings Program",
        type: "copay",
        description: "Copay savings for commercially insured Intelence patients.",
        eligibility: "Commercial/private insurance only.",
        savings: "Up to $7,500/year",
        phone: "1-877-227-3728",
        website: "https://www.janssencarepath.com/patient/intelence",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Intelence",
      },
      {
        name: "Janssen Patient Assistance Program",
        type: "pap",
        description: "Free Intelence for qualifying uninsured or underinsured patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-800-652-6227",
        website: "https://www.janssencarepath.com/patient/intelence",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Intelence",
      },
    ],
  },

  // ─── MERCK ────────────────────────────────────────────────────────
  {
    brandName: "Isentress",
    genericName: "Raltegravir",
    drugIds: ["raltegravir"],
    manufacturer: "Merck",
    programs: [
      {
        name: "Merck HIV Copay Savings Coupon",
        type: "copay",
        description: "A single coupon covers Isentress, Isentress HD, Delstrigo, and Pifeltro. Reduces out-of-pocket to as low as $0.",
        eligibility: "Commercial/private insurance. Not valid for Medicare/Medicaid. Redeemable once per 21 days; up to 90-day supply.",
        savings: "Up to $6,800/year",
        phone: "1-855-834-3467",
        website: "https://www.isentress.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Isentress",
      },
      {
        name: "Merck Helps Patient Assistance",
        type: "pap",
        description: "Free Isentress for uninsured or underinsured patients meeting income requirements.",
        eligibility: "Uninsured or underinsured US residents with income up to 600% FPL.",
        savings: "Free medication",
        phone: "1-800-727-5400",
        website: "https://www.merckhelps.com/ISENTRESS",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Isentress",
      },
    ],
  },
  {
    brandName: "Delstrigo",
    genericName: "Doravirine/Lamivudine/TDF",
    drugIds: ["delstrigo"],
    manufacturer: "Merck",
    programs: [
      {
        name: "Merck HIV Copay Savings Coupon",
        type: "copay",
        description: "Same coupon as Isentress – covers Delstrigo, Pifeltro, Isentress, and Isentress HD.",
        eligibility: "Commercial/private insurance. Redeemable once per 21 days.",
        savings: "Up to $6,800/year",
        phone: "1-855-834-3467",
        website: "https://www.delstrigo.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Delstrigo",
      },
      {
        name: "Merck Helps Patient Assistance",
        type: "pap",
        description: "Free Delstrigo for uninsured or underinsured qualifying patients.",
        eligibility: "Uninsured or underinsured US residents. Income up to 600% FPL.",
        savings: "Free medication",
        phone: "1-800-727-5400",
        website: "https://www.merckhelps.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Delstrigo",
      },
    ],
  },
  {
    brandName: "Pifeltro",
    genericName: "Doravirine",
    drugIds: ["doravirine"],
    manufacturer: "Merck",
    programs: [
      {
        name: "Merck HIV Copay Savings Coupon",
        type: "copay",
        description: "Same coupon covers Pifeltro, Delstrigo, Isentress, and Isentress HD.",
        eligibility: "Commercial/private insurance. Redeemable once per 21 days.",
        savings: "Up to $6,800/year",
        phone: "1-855-834-3467",
        website: "https://www.pifeltro.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Pifeltro",
      },
      {
        name: "Merck Helps Patient Assistance",
        type: "pap",
        description: "Free Pifeltro for uninsured or underinsured qualifying patients.",
        eligibility: "Uninsured or underinsured US residents. Income up to 600% FPL.",
        savings: "Free medication",
        phone: "1-800-727-5400",
        website: "https://www.merckhelps.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Pifeltro",
      },
    ],
  },

  // ─── ABBVIE ───────────────────────────────────────────────────────
  {
    brandName: "Kaletra",
    genericName: "Lopinavir/Ritonavir",
    drugIds: ["lopinavir_ritonavir"],
    manufacturer: "AbbVie",
    programs: [
      {
        name: "AbbVie myAbbVie Assist Copay Card",
        type: "copay",
        description: "Copay assistance for commercially insured Kaletra patients.",
        eligibility: "Commercial/private insurance. Not valid for government insurance programs.",
        savings: "Up to $400/month ($4,800/year)",
        phone: "1-800-364-4767",
        website: "https://www.abbvie.com/patients/patient-support/patient-assistance/savings-card.html",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Kaletra",
      },
      {
        name: "AbbVie Patient Assistance Foundation",
        type: "pap",
        description: "Free Kaletra for uninsured or underinsured patients meeting income requirements.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-800-222-6885",
        website: "https://www.abbvie.com/patients/patient-support/patient-assistance.html",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Kaletra",
      },
    ],
  },
  {
    brandName: "Norvir",
    genericName: "Ritonavir",
    drugIds: ["ritonavir"],
    manufacturer: "AbbVie",
    programs: [
      {
        name: "AbbVie myAbbVie Assist Copay Card",
        type: "copay",
        description: "Copay assistance for commercially insured patients taking Norvir as a boosting agent.",
        eligibility: "Commercial/private insurance. Not valid for government programs.",
        savings: "Up to $100/month ($1,200/year)",
        phone: "1-800-364-4767",
        website: "https://www.abbvie.com/patients/patient-support/patient-assistance/savings-card.html",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Norvir",
      },
      {
        name: "AbbVie Patient Assistance Foundation",
        type: "pap",
        description: "Free Norvir for uninsured or underinsured qualifying patients.",
        eligibility: "Uninsured or underinsured US residents.",
        savings: "Free medication",
        phone: "1-800-222-6885",
        website: "https://www.abbvie.com/patients/patient-support/patient-assistance.html",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Norvir",
      },
    ],
  },

  // ─── THERATECHNOLOGIES ────────────────────────────────────────────
  {
    brandName: "Trogarzo",
    genericName: "Ibalizumab",
    drugIds: ["ibalizumab"],
    manufacturer: "Theratechnologies",
    programs: [
      {
        name: "Theratechnologies Patient Support Program",
        type: "copay",
        description: "Copay and access support for commercially insured Trogarzo patients (heavily treatment-experienced).",
        eligibility: "Commercial insurance. Residency and income requirements apply.",
        phone: "1-833-843-7289",
        website: "https://www.trogarzo.com/patient-support",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Trogarzo",
      },
    ],
  },

  // ─── PFIZER ───────────────────────────────────────────────────────
  {
    brandName: "Selzentry",
    genericName: "Maraviroc",
    drugIds: ["maraviroc"],
    manufacturer: "Pfizer/ViiV Healthcare",
    programs: [
      {
        name: "ViiVConnect Copay Assistance",
        type: "copay",
        description: "Copay assistance for commercially insured Selzentry patients.",
        eligibility: "Commercial/private insurance only.",
        phone: "1-844-588-3288",
        website: "https://www.viivconnect.com",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Selzentry",
      },
    ],
  },

  // ─── ROCHE/GENENTECH ──────────────────────────────────────────────
  {
    brandName: "Fuzeon",
    genericName: "Enfuvirtide",
    drugIds: ["enfuvirtide"],
    manufacturer: "Genentech/Roche",
    programs: [
      {
        name: "Genentech Access Solutions",
        type: "pap",
        description: "Patient assistance for uninsured or underinsured Fuzeon patients.",
        eligibility: "Uninsured or underinsured US residents meeting income requirements.",
        savings: "Free or reduced-cost medication",
        phone: "1-888-249-4918",
        website: "https://www.needymeds.org/drug_list.taf?_function=name&name=Fuzeon",
        needymedsUrl: "https://www.needymeds.org/drug_list.taf?_function=name&name=Fuzeon",
      },
    ],
  },
];

// ─── BROADER ASSISTANCE RESOURCES ─────────────────────────────────
export type BroaderResource = {
  name: string;
  category: "adap" | "foundation" | "federal" | "directory";
  description: string;
  eligibility: string;
  phone?: string;
  website: string;
  needymedsUrl?: string;
};

export const broaderResources: BroaderResource[] = [
  {
    name: "AIDS Drug Assistance Program (ADAP)",
    category: "adap",
    description: "Federal/state program providing HIV medications to low-income, uninsured, and underinsured people with HIV. Available in all 50 states and U.S. territories.",
    eligibility: "Low-income individuals with HIV diagnosis. Must be a U.S. resident. Each state has different income limits and formularies.",
    phone: "1-800-448-0440",
    website: "https://adap.directory/directory",
    needymedsUrl: "https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745&disease_eng=HIV/AIDS",
  },
  {
    name: "Ryan White HIV/AIDS Program",
    category: "federal",
    description: "Federal program providing a comprehensive system of care for low-income people with HIV. Covers medications, medical care, and support services.",
    eligibility: "Low-income individuals with HIV who are uninsured or underinsured.",
    phone: "1-800-448-0440",
    website: "https://ryanwhite.hrsa.gov",
  },
  {
    name: "HealthWell Foundation – HIV/AIDS Fund",
    category: "foundation",
    description: "Non-profit providing copay assistance for HIV-positive patients with commercial insurance or Medicare Part D. Can help with premiums and cost-sharing.",
    eligibility: "Commercially insured or Medicare Part D patients with HIV. Income up to 400–500% FPL.",
    phone: "1-800-675-8416",
    website: "https://www.healthwellfoundation.org/disease-funds/",
    needymedsUrl: "https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745",
  },
  {
    name: "Patient Access Network (PAN) Foundation – HIV",
    category: "foundation",
    description: "Provides financial assistance to underinsured patients with HIV to cover out-of-pocket costs including copays, premiums, and deductibles.",
    eligibility: "Commercially insured with income up to 400% FPL. Must be a U.S. resident.",
    phone: "1-866-316-7263",
    website: "https://www.panfoundation.org/disease-funds/hiv/",
    needymedsUrl: "https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745",
  },
  {
    name: "NeedyMeds – HIV/AIDS Programs Directory",
    category: "directory",
    description: "Comprehensive directory of 365+ diagnosis-based assistance programs, PAPs, and copay cards for HIV/AIDS medications. Free to search and access.",
    eligibility: "Varies by program. Search by medication name or diagnosis.",
    phone: "1-800-503-6897",
    website: "https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745&disease_eng=HIV/AIDS",
    needymedsUrl: "https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745&disease_eng=HIV/AIDS",
  },
  {
    name: "Ramp Health – HIV Patient Navigation",
    category: "foundation",
    description: "Connects HIV patients with financial assistance resources, insurance navigation, and medication access programs.",
    eligibility: "People living with HIV in the United States.",
    website: "https://www.ramp.health",
  },
];

export function getAssistanceForDrug(drugId: string): DrugAssistanceEntry | undefined {
  return drugAssistanceData.find(entry =>
    entry.drugIds.includes(drugId)
  );
}

export function getAllManufacturers(): string[] {
  return [...new Set(drugAssistanceData.map(d => d.manufacturer))];
}
