export const NCD_STEPS = [0, 10, 20, 30, 40, 50];

export const INSURER_PROFILES = {
  income: {
    name: "Income Insurance",
    planName: "Drivesafe / Motor Insurance",
    ruleLabel: "GIA Standard · Quality Workshop Scheme",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 1000,
    youngDriverExcess: 2500,
    windscreenExcess: 100,
    minNcdForProtector: 50,
    sourceLabel: "Income Drivesafe Policy Conditions (Section 1 & Endorsement)",
    clauses: {
      baseExcess: {
        ref: "Income Drivesafe Policy Schedule · Section 1 (Own Damage)",
        title: "Standard Policy Excess",
        text: "The policyholder is liable to pay the standard own-damage excess stated in the Schedule for each accident before Income indemnifies covered repair costs.",
      },
      unauthorizedWorkshop: {
        ref: "Income Drivesafe Policy Endorsement 101 (Quality Workshop Scheme)",
        title: "Non-Authorised Workshop Surcharge",
        text: "Repairs must be carried out at an Income Quality Workshop. If the vehicle is repaired at an unauthorised workshop, an additional excess of S$1,000 applies to each and every claim.",
      },
      youngDriver: {
        ref: "Income General Exceptions & Table of Excesses — Clause 3(b)",
        title: "Young and Inexperienced Driver Additional Excess",
        text: "An additional excess of S$2,500 applies if the vehicle is driven by any person aged under 25 years or holding a valid Singapore driving licence for less than 2 years at the time of the accident.",
      },
      windscreen: {
        ref: "Income Section 1 — Windscreen Endorsement W1",
        title: "Windscreen and Window Glass Replacement",
        text: "Payment of S$100 excess applies for windscreen replacement. Replacement or repair under this endorsement shall not affect the accrued No Claim Discount (NCD).",
      },
      ncdProtector: {
        ref: "Income NCD Protector Endorsement 50",
        title: "No Claim Discount Protection Guarantee",
        text: "Maintains your 50% NCD upon the first own-damage at-fault claim within the policy period under Income Drivesafe terms.",
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
    sourceLabel: "MSIG MotorMax Policy Schedule & Endorsement 101",
    clauses: {
      baseExcess: {
        ref: "MSIG MotorMax Schedule · Section 1 Table of Excesses",
        title: "Standard Policy Excess",
        text: "The first amount of each claim for loss or damage to the insured vehicle which the policyholder must bear as specified in the Schedule.",
      },
      unauthorizedWorkshop: {
        ref: "MSIG MotorMax Schedule Endorsement M101",
        title: "Authorised Workshop Network Condition",
        text: "All repairs must be performed by an MSIG Authorised Workshop. Failure to comply imposes an additional S$1,000 excess per own-damage claim.",
      },
      youngDriver: {
        ref: "MSIG Schedule of Excesses Endorsement 102",
        title: "Young & Inexperienced Driver Additional Excess",
        text: "A mandatory S$2,500 excess applies if the driver is under 25 years old or has held a valid licence for under 2 consecutive years.",
      },
      windscreen: {
        ref: "MSIG MotorMax Section 1 — Endorsement 103",
        title: "Windscreen Reinstatement Cover",
        text: "Windscreen damage claim requires S$100 excess and does not impact your No Claim Discount upon renewal.",
      },
      ncdProtector: {
        ref: "MSIG MotorMax NCD Protector Rider",
        title: "NCD Protector Benefit",
        text: "Guarantees preservation of current 50% NCD tier for one single at-fault claim during the policy period.",
      },
    },
  },
  etiqa: {
    name: "Etiqa (Tiq)",
    planName: "Tiq Motor Comprehensive",
    ruleLabel: "GIA Standard · Authorised Workshops",
    ncdDropPoints: 30,
    unauthorizedWorkshopExcess: 2000,
    youngDriverExcess: 2000,
    windscreenExcess: 100,
    minNcdForProtector: 40,
    sourceLabel: "Etiqa Tiq Motor Insurance Policy Wording (Part 1)",
    clauses: {
      baseExcess: {
        ref: "Etiqa Tiq Motor Policy Schedule · Section 1 Excess",
        title: "Own Damage Basic Excess",
        text: "The basic excess you must pay towards each own-damage claim as stated on your Policy Schedule.",
      },
      unauthorizedWorkshop: {
        ref: "Etiqa Tiq Motor Policy Part 1 — Clause 4.2",
        title: "Authorised Workshop Scheme & Non-Authorised Workshop Excess",
        text: "Repairs must be undertaken at Tiq Authorised Workshops. An additional non-authorised workshop excess of S$2,000 applies if repaired elsewhere.",
      },
      youngDriver: {
        ref: "Etiqa Tiq Motor Table of Excesses — Clause 5",
        title: "Young & Inexperienced Driver Surcharge",
        text: "An additional excess of S$2,000 applies if the authorized driver is under 25 years of age or holds a driving licence for less than 2 years.",
      },
      windscreen: {
        ref: "Etiqa Tiq Motor Part 1 — Windscreen Clause",
        title: "Windscreen and Window Glass Cover",
        text: "Subject to a S$100 excess. Any claim under this clause will not prejudice your No Claim Discount.",
      },
      ncdProtector: {
        ref: "Etiqa Tiq Motor NCD Protector Clause",
        title: "NCD Protector (Available from 40% NCD)",
        text: "Protects current NCD tier (available for 40% and 50% holders) against one at-fault claim per period.",
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
    sourceLabel: "FWD Motor Policy Schedule & Table of Excesses",
    clauses: {
      baseExcess: {
        ref: "FWD Motor Policy Schedule · Section 1 Excess",
        title: "Own Damage Standard Excess",
        text: "The specified amount you pay out-of-pocket towards any accidental damage repair claim.",
      },
      unauthorizedWorkshop: {
        ref: "FWD Motor Contract — Section 1 Network Clause",
        title: "Approved Network Workshop Excess",
        text: "Repairs conducted outside the FWD Approved Workshop Network incur an additional S$1,000 excess.",
      },
      youngDriver: {
        ref: "FWD Motor Policy Schedule — Table of Additional Excesses",
        title: "Young Driver & Inexperienced Driver Clause",
        text: "Young driver excess of S$2,500 applies for drivers aged under 25 or holding driving licence for <2 years.",
      },
      windscreen: {
        ref: "FWD Comprehensive Motor — Windscreen Replacement Clause",
        title: "Windscreen Glass Protection",
        text: "S$100 excess applies for windscreen replacement; 0% deduction from accrued NCD upon renewal.",
      },
      ncdProtector: {
        ref: "FWD Lifetime / Standard NCD Protector Benefit",
        title: "NCD Protector Guarantee",
        text: "Available for 40% and 50% NCD tiers to shield against an own-damage claim.",
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
    sourceLabel: "General Insurance Association of Singapore (GIA) MCF Baseline",
    clauses: {
      baseExcess: {
        ref: "Standard Singapore Private Car Policy · Section 1",
        title: "Standard Own Damage Excess",
        text: "Contractual deductible payable by the policyholder on an own-damage claim.",
      },
      unauthorizedWorkshop: {
        ref: "GIA General Market Authorised Workshop Schedule",
        title: "Non-Approved Workshop Excess",
        text: "An additional excess of S$1,000 applies when repairing outside insurer-designated workshops.",
      },
      youngDriver: {
        ref: "GIA Standard Table of Excesses",
        title: "Young and Inexperienced Driver Surcharge",
        text: "Standard industry S$2,500 excess for drivers under 25 or with license under 2 years.",
      },
      windscreen: {
        ref: "GIA Standard Windscreen Endorsement W1",
        title: "Windscreen Glass Reinstatement",
        text: "Fixed S$100 excess with zero NCD deduction upon renewal.",
      },
      ncdProtector: {
        ref: "GIA Standard NCD Protector Guidelines",
        title: "NCD Protector Rider",
        text: "Protects NCD tier against a single at-fault claim.",
      },
    },
  },
};
