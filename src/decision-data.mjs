export const NCD_STEPS = [0, 10, 20, 30, 40, 50];

export const VEHICLE_USAGES = {
  PRIVATE: "private",
  PHV: "phv",
};

export const PHV_DEFAULTS = {
  typicalPremium: 3200,
  typicalExcess: 1500,
  defaultCommercialLoading: 15,
  defaultDailyDowntimeCost: 80,
  defaultClaimDowntimeDays: 5,
  defaultSelfPayDowntimeDays: 1,
};

export const INSURER_PROFILES = {
  income: {
    name: "Income Insurance",
    planName: "Drivo Private Car Comprehensive",
    ruleLabel: "GIA Standard · Drivo Workshop Scheme",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 0,
    workshopRule: "Income's wording sets no extra excess for workshop choice. Where the car is repaired depends on your Drivo plan: Premium allows your preferred workshop, Advantage uses drivo Advantage authorised workshops, and Classic uses a workshop Income chooses.",
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 30,
    youngDriverAgeThreshold: 27,
    youngDriverLicenceYears: 1,
    sourceLabel: "Income Drivo Private Car Policy Conditions (September 2026) & Schedule",
    clauses: {
      baseExcess: {
        ref: "Income Drivo Policy Conditions · Plan Summary & Schedule (PDF p.1)",
        title: "Standard Policy Excess",
        text: "Illustrative summary: The policyholder bears the standard own-damage excess stated in the individual Policy Schedule/Certificate before Income indemnifies covered repair costs.",
      },
      unauthorizedWorkshop: {
        ref: "Income Drivo Policy Conditions · Section 1 clause 3 (PDF p.3)",
        title: "Workshop Scheme & Schedule Excess Surcharge",
        text: "Policy conditions, Section 1 clause 3: \"If you are insured under our drivo© Advantage Plan, your vehicle will be repaired at drivo Advantage authorised workshops.\" \"If you are insured under our drivo© Classic Plan, your vehicle will be repaired at a workshop we have chosen.\"",
      },
      youngDriver: {
        ref: "Income Drivo Policy Conditions · Section 1 clause 8 Unnamed driver excess (PDF p.3)",
        title: "Young / Inexperienced or Unnamed Driver Excess",
        text: "Policy conditions, Section 1 clause 8: an unnamed driver \"Under 27 years old or has less than one year’s driving experience\" carries an excess of S$2,500; one \"27 years old and above with one or more year’s driving experience\" carries S$500.",
      },
      windscreen: {
        ref: "Income Drivo Policy Conditions · Plan Summary Windscreen Cover (PDF p.1)",
        title: "Windscreen and Window Glass Replacement",
        text: "Illustrative summary: A S$100 reinstatement excess applies to windscreen replacement under the standard plan summary, without reducing accrued No-Claim Discount (NCD).",
      },
      ncdProtector: {
        ref: "Income Drivo Summary of Cover · Optional Cover (PDF p.1)",
        title: "No-Claim Discount (NCD) Protector Optional Benefit",
        text: "Plan summary, Optional Cover: \"NCD Protector (applicable to policy with at least 30% NCD)\". The rider terms are set out in your Schedule.",
      },
    },
  },
  msig: {
    name: "MSIG Insurance",
    planName: "MotorMax / MotorMax Plus",
    ruleLabel: "GIA Standard · MotorMax Scheme",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 0,
    workshopRule: "Under MSIG's Compulsory Authorised Workshop Usage endorsement, the policy only pays for accident repairs carried out at an MSIG authorised workshop. Repairs elsewhere are not covered when this endorsement is on your Schedule.",
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 50,
    youngDriverAgeThreshold: 23,
    sourceLabel: "MSIG MotorMax Policy Wording & Schedule",
    clauses: {
      baseExcess: {
        ref: "MSIG MotorMax Policy · Section I Own Damage Excess (PDF p.5)",
        title: "Standard Policy Excess",
        text: "Illustrative summary: The first amount of each own-damage claim borne by the policyholder as specified in the Policy Schedule under Section I.",
      },
      unauthorizedWorkshop: {
        ref: "MSIG MotorMax Endorsement · Compulsory Authorised Workshop Usage (PDF p.19)",
        title: "Compulsory Authorised Workshop Condition",
        text: "Endorsement, Compulsory Authorised Workshop Usage: \"this Policy will only indemnify the Policyholder for the costs of any accident repair to the Insured Vehicle provided such repair is carried out at one of our Authorised Workshops.\"",
      },
      youngDriver: {
        ref: "MSIG MotorMax Section I · Young and/or Inexperienced Driver Excess (PDF p.5)",
        title: "Young and/or Inexperienced Driver Additional Excess",
        text: "Illustrative summary: MSIG MotorMax Section I defines a young/inexperienced driver as under 23 years old (or schedule age threshold) or holding a valid licence for less than 2 years; the calculator models a S$2,500 additional excess.",
      },
      windscreen: {
        ref: "MSIG MotorMax Section I · Windscreen/Window Glass Cover (PDF p.4)",
        title: "Windscreen Reinstatement Cover",
        text: "Illustrative summary: Windscreen replacement carries a S$100 excess (waived for resin repairs) under Section I and does not reduce your No-Claim Discount upon renewal.",
      },
      ncdProtector: {
        ref: "MSIG MotorMax General Conditions · NCD Scale & Rider Schedule (PDF p.11)",
        title: "No-Claim Discount Scale & Protector Rider",
        text: "Illustrative summary: Preserves the 50% NCD tier for one at-fault claim when the optional NCD Protector endorsement is elected on the Policy Schedule.",
      },
    },
  },
  etiqa: {
    name: "Etiqa (Tiq)",
    planName: "Tiq Private Car Comprehensive",
    ruleLabel: "GIA Standard · Authorised Workshops",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 0,
    workshopRule: "Etiqa's Authorised Workshop Scheme requires the car to go to an Etiqa authorised workshop; otherwise Etiqa reserves the right to decline the own-damage claim. On a Comprehensive Any Workshop plan, the excess is instead reduced by S$500 when you do use an authorised workshop.",
    youngDriverExcess: 4000,
    windscreenExcess: 100,
    minNcdForProtector: 30,
    youngDriverAgeThreshold: 27,
    sourceLabel: "Etiqa Private Car Insurance Policy Wording V19 (February 2026)",
    clauses: {
      baseExcess: {
        ref: "Etiqa Tiq Motor Policy Wording · Excess All/Own Damage Claims (PDF p.16)",
        title: "Own Damage Basic Excess",
        text: "Illustrative summary: The basic own-damage excess payable towards each accident claim as specified on your Policy Schedule.",
      },
      unauthorizedWorkshop: {
        ref: "Etiqa Tiq Motor Policy Wording · Authorised Workshop Scheme clauses 1–2 (PDF p.19)",
        title: "Authorised Workshop Scheme & Non-Authorised Excess",
        text: "Authorised Workshop Scheme: \"Your Car must be brought to an Etiqa authorised workshop selected and approved by Us for repairs. Failure to do so, We reserve the right to decline liability under Section I of the Policy.\"",
      },
      youngDriver: {
        ref: "Etiqa Tiq Motor Policy Wording · Endorsement MDP YEID Excess (PDF p.17)",
        title: "Young, Elderly and/or Inexperienced Driver Surcharge",
        text: "Endorsement MDP: an additional excess of S$4,000 applies for unnamed drivers \"below twenty-seven (27) years old\", \"above seventy-five (75) years old\", and/or who have \"held a full driving license for less than two (2) years\".",
      },
      windscreen: {
        ref: "Etiqa Tiq Motor Policy Wording · Windscreen Endorsement (PDF p.17)",
        title: "Windscreen and Window Glass Cover",
        text: "Illustrative summary: Subject to a S$100 reinstatement excess (waived for repair) without affecting your accrued No-Claim Discount.",
      },
      ncdProtector: {
        ref: "Etiqa Tiq Motor Policy Wording · Optional Benefit 1 NCD Protector (PDF p.9)",
        title: "NCD Protector Optional Benefit",
        text: "Optional Benefit, NCD Protector (applicable for 30% onwards): \"If You are entitled to 30%, 40% or 50% NCD, in the event there is one (1) claim made against Your policy within the Period of Insurance, You will be allowed to retain Your NCD.\"",
      },
    },
  },
  fwd: {
    name: "FWD Singapore",
    planName: "FWD Comprehensive Motor",
    ruleLabel: "GIA Standard · Approved Network",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 1000,
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 40,
    youngDriverAgeThreshold: 25,
    sourceLabel: "FWD Motor Policy Schedule Assumptions (No Local PDF Bundled)",
    clauses: {
      baseExcess: {
        ref: "FWD Motor Policy Schedule · Section 1 Own Damage Excess",
        title: "Own Damage Standard Excess",
        text: "Illustrative assumption: The basic deductible payable out-of-pocket towards an own-damage repair claim as stated in your FWD Policy Schedule.",
      },
      unauthorizedWorkshop: {
        ref: "FWD Motor Policy Schedule · Non-Network Workshop Excess Assumption",
        title: "Approved Network Workshop Excess",
        text: "Illustrative assumption: Repairs outside the insurer's approved workshop network are modeled with an additional S$1,000 excess; verify your FWD Policy Schedule.",
      },
      youngDriver: {
        ref: "FWD Motor Policy Schedule · Young/Inexperienced Driver Excess Assumption",
        title: "Young & Inexperienced Driver Clause",
        text: "Illustrative assumption: Modeled with a S$2,500 additional excess for drivers under 25 or holding a driving licence for less than 2 years; verify your FWD Schedule.",
      },
      windscreen: {
        ref: "FWD Motor Policy · Windscreen Replacement Assumption",
        title: "Windscreen Glass Protection",
        text: "Illustrative assumption: Modeled with a S$100 excess for windscreen replacement and 0% NCD reduction upon renewal.",
      },
      ncdProtector: {
        ref: "FWD Motor Policy · NCD Protector Rider Assumption",
        title: "NCD Protector Benefit",
        text: "Illustrative assumption: Modeled as preserving 40% or 50% NCD for one at-fault claim when elected on the Policy Schedule.",
      },
    },
  },
  other: {
    name: "Other / General SG Insurer",
    planName: "Standard Private Car Policy",
    ruleLabel: "GIA Motor Claims Framework Baseline",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 1000,
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 50,
    youngDriverAgeThreshold: 25,
    sourceLabel: "General Insurance Association of Singapore (GIA) Market Baseline",
    clauses: {
      baseExcess: {
        ref: "Standard Singapore Private Car Policy · Section 1 Schedule",
        title: "Standard Own Damage Excess",
        text: "Illustrative baseline: Contractual deductible payable by the policyholder on an own-damage claim.",
      },
      unauthorizedWorkshop: {
        ref: "Standard Singapore Motor Schedule · Non-Authorised Workshop Assumption",
        title: "Non-Approved Workshop Excess",
        text: "Illustrative baseline: Modeled with an additional S$1,000 excess when repairing outside insurer-designated workshops.",
      },
      youngDriver: {
        ref: "Standard Singapore Motor Schedule · Young/Inexperienced Driver Assumption",
        title: "Young and Inexperienced Driver Surcharge",
        text: "Illustrative baseline: Modeled with a S$2,500 additional excess for young or inexperienced drivers (<2 years licence).",
      },
      windscreen: {
        ref: "GIA Standard Windscreen Endorsement W1 Baseline",
        title: "Windscreen Glass Reinstatement",
        text: "Illustrative baseline: Fixed S$100 excess with zero NCD deduction upon renewal.",
      },
      ncdProtector: {
        ref: "Standard Singapore Motor Schedule · NCD Protector Rider Baseline",
        title: "NCD Protector Rider",
        text: "Illustrative baseline: Protects accrued NCD tier against a single at-fault own-damage claim.",
      },
    },
  },
};
