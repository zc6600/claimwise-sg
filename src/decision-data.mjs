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
    unauthorizedWorkshopExcess: 1000,
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 50,
    youngDriverAgeThreshold: 25,
    sourceLabel: "Income Drivo Private Car Policy Conditions (September 2026) & Schedule",
    clauses: {
      baseExcess: {
        ref: "Income Drivo Policy Conditions · Plan Summary & Schedule (PDF p.1)",
        title: "Standard Policy Excess",
        text: "Illustrative summary: The policyholder bears the standard own-damage excess stated in the individual Policy Schedule/Certificate before Income indemnifies covered repair costs.",
      },
      unauthorizedWorkshop: {
        ref: "Income Drivo Policy Conditions · Plan Summary Workshop Options (PDF p.1)",
        title: "Workshop Scheme & Schedule Excess Surcharge",
        text: "Illustrative summary: Workshop access depends on the selected Drivo plan tier and policy schedule; the calculator models a S$1,000 non-authorised workshop excess assumption—verify your Certificate of Insurance.",
      },
      youngDriver: {
        ref: "Income Drivo Policy Conditions · Plan Summary Additional Excess (PDF p.1)",
        title: "Young / Inexperienced or Unnamed Driver Excess",
        text: "Illustrative summary: Additional excess (modeled at S$2,500) applies under schedule conditions when the driver is below the policy age threshold or holds a valid Singapore driving licence for less than 2 years.",
      },
      windscreen: {
        ref: "Income Drivo Policy Conditions · Plan Summary Windscreen Cover (PDF p.1)",
        title: "Windscreen and Window Glass Replacement",
        text: "Illustrative summary: A S$100 reinstatement excess applies to windscreen replacement under the standard plan summary, without reducing accrued No-Claim Discount (NCD).",
      },
      ncdProtector: {
        ref: "Income Drivo Policy Conditions · Plan Summary & NCD Scale (PDF p.1 & p.7)",
        title: "No-Claim Discount (NCD) Protector Optional Benefit",
        text: "Illustrative summary: Optional NCD Protector rider preserves a qualifying 50% NCD tier upon the first at-fault claim within the policy period; check your Schedule for rider eligibility.",
      },
    },
  },
  msig: {
    name: "MSIG Insurance",
    planName: "MotorMax / MotorMax Plus",
    ruleLabel: "GIA Standard · MotorMax Scheme",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 1000,
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
        text: "Illustrative summary: Under the Compulsory Authorised Workshop Usage endorsement (MotorMax plan), repairs outside MSIG's authorised workshop network incur an additional schedule excess (modeled at S$1,000).",
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
    unauthorizedWorkshopExcess: 2000,
    youngDriverExcess: 2000,
    windscreenExcess: 100,
    minNcdForProtector: 40,
    youngDriverAgeThreshold: 25,
    sourceLabel: "Etiqa Private Car Insurance Policy Wording V19 (February 2026)",
    clauses: {
      baseExcess: {
        ref: "Etiqa Tiq Motor Policy Wording · Excess All/Own Damage Claims (PDF p.16)",
        title: "Own Damage Basic Excess",
        text: "Illustrative summary: The basic own-damage excess payable towards each accident claim as specified on your Policy Schedule.",
      },
      unauthorizedWorkshop: {
        ref: "Etiqa Tiq Motor Policy Part 1 — Clause 4.2 · Authorised Workshop Scheme (PDF p.19)",
        title: "Authorised Workshop Scheme & Non-Authorised Excess",
        text: "Illustrative summary: Repairs outside Etiqa's Authorised Workshop Scheme are subject to an additional schedule excess (modeled at S$2,000; verify your Policy Schedule).",
      },
      youngDriver: {
        ref: "Etiqa Tiq Motor Policy Wording · Young/Inexperienced Driver Excess (PDF p.17)",
        title: "Young, Elderly and/or Inexperienced Driver Surcharge",
        text: "Illustrative summary: An additional excess (modeled at S$2,000; check your Schedule) applies when the driver is under the policy age threshold or holds a driving licence for less than 2 years.",
      },
      windscreen: {
        ref: "Etiqa Tiq Motor Policy Wording · Windscreen Endorsement (PDF p.17)",
        title: "Windscreen and Window Glass Cover",
        text: "Illustrative summary: Subject to a S$100 reinstatement excess (waived for repair) without affecting your accrued No-Claim Discount.",
      },
      ncdProtector: {
        ref: "Etiqa Tiq Motor Policy Wording · NCD Protector & Scale (PDF p.9 & p.15)",
        title: "NCD Protector Optional Benefit",
        text: "Illustrative summary: Protects eligible 40% or 50% NCD policyholders against one at-fault claim during the policy period when shown on the Schedule.",
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
