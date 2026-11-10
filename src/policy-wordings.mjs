/**
 * Verbatim excerpts from the insurer policy wordings bundled in `public/policies/`.
 *
 * Every excerpt is copied word for word from the cited PDF page; only line breaks and
 * column layout are normalised, and "…" marks omitted text. Page numbers are physical PDF pages (1-based), which is
 * what `#page=` anchors resolve to, not the folio printed in the footer.
 *
 * `summary` is a one-line plain reading of the excerpt for scanning; the excerpt
 * itself is the authority.
 *
 * An entry with `excerpt: null` means the bundled wording does not state that rule, and
 * `note` explains where the term is set instead (usually the individual Policy Schedule).
 * These records are a reference display only; calculator inputs live in
 * `INSURER_PROFILES` (src/decision-data.mjs) and are intentionally kept separate.
 */

/** Date the bundled wordings and excerpts were last checked against the insurer PDFs. */
export const WORDINGS_REVIEWED_ON = "2026-11-10";

export const WORDING_TOPICS = [
  {
    id: "ownDamageExcess",
    slug: "excess",
    shortTitle: "Excess",
    title: "Own-damage excess",
    question: "What do I pay first on every accident claim?",
  },
  {
    id: "workshop",
    slug: "workshop",
    shortTitle: "Workshop",
    title: "Workshop requirement",
    question: "Where must the car be repaired?",
  },
  {
    id: "unnamedDriver",
    slug: "young-driver-excess",
    shortTitle: "Young drivers",
    title: "Young, inexperienced or unnamed driver excess",
    question: "What extra excess applies to other drivers?",
  },
  {
    id: "windscreen",
    slug: "windscreen",
    shortTitle: "Windscreen",
    title: "Windscreen claims",
    question: "What does a windscreen claim cost, and does it affect NCD?",
  },
  {
    id: "ncdScale",
    slug: "ncd-after-claim",
    shortTitle: "NCD after a claim",
    title: "No-claim discount after a claim",
    question: "How far does my NCD fall after a claim?",
  },
  {
    id: "ncdProtector",
    slug: "ncd-protector",
    shortTitle: "NCD Protector",
    title: "NCD Protector",
    question: "Who can buy NCD protection, and what does it keep?",
  },
];

export const POLICY_WORDINGS = [
  {
    id: "income",
    calculatorInsurer: "income",
    insurer: "Income Insurance",
    document: "Drivo Private Car — Summary of Cover and Policy Conditions",
    version: "MT/Private Car/202609",
    pdfFile: "/policies/income_drivo_policy.pdf",
    entries: {
      ownDamageExcess: {
        summary: "Amount on your Schedule or Certificate",
        page: 1,
        section: "Summary of Private Car insurance cover",
        excerpt: [
          "Policy excess as shown on the Schedule or Certificate of Insurance applies for each and every accident claim",
        ],
        note: "The wording sets no amount; your excess is printed on your Schedule or Certificate of Insurance.",
      },
      workshop: {
        summary: "Set by plan: Premium any workshop, Advantage authorised, Classic Income’s choice",
        page: 3,
        section: "Section 1 · Your vehicle, clause 3",
        excerpt: [
          "If you are insured under our drivo© Advantage Plan, your vehicle will be repaired at drivo Advantage authorised workshops.",
          "If you are insured under our drivo© Classic Plan, your vehicle will be repaired at a workshop we have chosen.",
        ],
        note: "The plan summary (page 1) lists repairs at your preferred workshop under Drivo Premium. The wording states no extra excess for a non-authorised workshop.",
      },
      unnamedDriver: {
        summary: "S$2,500 under 27 or under 1 year driving; otherwise S$500",
        page: 3,
        section: "Section 1 · Your vehicle, clause 8",
        excerpt: [
          "If the vehicle is driven by an unnamed driver, the following excess will apply.",
          "Under 27 years old or has less than one year’s driving experience — S$2,500",
          "27 years old and above with one or more year’s driving experience — S$ 500",
        ],
      },
      windscreen: {
        summary: "S$100 or Schedule amount · NCD unaffected",
        page: 1,
        section: "Summary of Private Car insurance cover",
        excerpt: [
          "Windscreen Excess of S$100 or any other amount shown on the Schedule or Certificate of Insurance applies for each and every claim",
        ],
        note: "Page 7: the NCD reduction “does not apply if you make a windscreen claim.”",
      },
      ncdScale: {
        summary: "50%→20% · 40%→10% · 30% and under→0%",
        page: 7,
        section: "E · General information, clause 2 No-claim discount (NCD)",
        excerpt: ["If there is a claim made under the policy, we will reduce the discount as follows."],
        table: {
          headers: ["Current discount", "Discount after one claim"],
          rows: [
            ["50%", "20%"],
            ["40%", "10%"],
            ["30% and under", "0%"],
          ],
        },
      },
      ncdProtector: {
        summary: "Available from 30% NCD",
        page: 1,
        section: "Summary of Private Car insurance cover · Optional Cover",
        excerpt: ["NCD Protector (applicable to policy with at least 30% NCD)"],
        note: "The policy conditions do not set out the protector’s claim rules; check the rider on your Schedule.",
      },
    },
  },
  {
    id: "msig",
    calculatorInsurer: "msig",
    insurer: "MSIG Insurance",
    document: "MotorMax Policy Wording",
    version: "QMX032604",
    pdfFile: "/policies/msig_motormax_policy.pdf",
    entries: {
      ownDamageExcess: {
        summary: "Amount on your Schedule",
        page: 4,
        section: "Exclusions to Section I, clause 1(a)",
        excerpt: ["We shall not be liable to pay for: a) the excess amount as shown in the schedule and its applicable GST"],
        note: "The wording sets no amount; your excess is printed on your Schedule.",
      },
      workshop: {
        summary: "Authorised workshops only where the endorsement applies",
        page: 19,
        section: "Endorsement · Compulsory Authorised Workshop Usage",
        excerpt: [
          "It is hereby understood and agreed that this Policy will only indemnify the Policyholder for the costs of any accident repair to the Insured Vehicle provided such repair is carried out at one of our Authorised Workshops.",
        ],
        note: "This is an endorsement; it applies when it appears on your Schedule. Where it applies, repairs elsewhere are not covered at all rather than charged an extra excess.",
      },
      unnamedDriver: {
        summary: "S$2,500 under 23 or licence under 2 years",
        page: 5,
        section: "Exclusions to Section I, clause 1(b)",
        excerpt: [
          "young and/or inexperienced driver excess of S$2,500 and its applicable GST. The young and/or inexperienced driver excess is applicable in addition to the excess amount specified in the schedule if the insured vehicle is driven by or under the control of you and any person who at the time of loss or damage to the insured vehicle is under 23 years old, and/or has held a valid driving license under 2 years.",
        ],
      },
      windscreen: {
        summary: "S$100 or Schedule amount, whichever is higher · waived for repair · NCD unaffected",
        page: 4,
        section: "Section I, clause 2 · Loss or damage to windscreen, window, IU and OBU",
        excerpt: [
          "Notwithstanding the coverage provided above, you shall be responsible to pay for the first S$100 or the amount specified as windscreen excess in the schedule and its applicable goods and services tax (GST), whichever is the higher amount for each and every claim made under this sub-section.",
          "We will waive this amount, if the claim under this sub-section is limited to the windscreen glass being repaired instead of replaced. Payment by us under this sub-section will not affect your No Claim Discount.",
        ],
      },
      ncdScale: {
        summary: "50%→20% · 40%→10% · 30% or less→0% · 2+ claims→0%",
        page: 8,
        section: "No Claim Discount",
        excerpt: [
          "If at the time of a claim the No Claim Discount is 40% or 50%, the No Claim Discount shall be reduced to 10% or 20% respectively at the next renewal of the policy. If the No Claim Discount is 30% or less, then the whole No Claim Discount is rescinded.",
          "If more than one claim is made during any one Period of Insurance the entire No Claim Discount is rescinded, irrespective of the percentage earned.",
        ],
      },
      ncdProtector: {
        summary: "Not stated in this wording",
        page: null,
        section: null,
        excerpt: null,
        note: "The bundled MotorMax wording does not mention an NCD Protector. Eligibility and terms are set in a separate rider, if one is shown on your Schedule.",
      },
    },
  },
  {
    id: "etiqa",
    calculatorInsurer: "etiqa",
    insurer: "Etiqa",
    document: "Tiq Private Car Insurance Policy Wording",
    version: "V19 · February 2026",
    pdfFile: "/policies/etiqa_tiq_motor_policy.pdf",
    entries: {
      ownDamageExcess: {
        summary: "Amount on your Schedule",
        page: 16,
        section: "Endorsement No. M2(A)P · Excess – Own Damage Claims",
        excerpt: [
          "It is hereby declared and agreed that notwithstanding anything to the contrary contained in this Policy the Insured in respect of each and every event shall be responsible for the first amount stated under “excess” in the Schedule of the Policy (or any less expenditure which may be incurred) of any expenditure for which provision is made thereunder.",
        ],
        note: "The wording sets no amount; your excess is printed on your Schedule.",
      },
      workshop: {
        summary: "Authorised workshop required, or the claim may be declined",
        page: 19,
        section: "Authorised Workshop Scheme (Exclusive Benefits), clauses 1–2",
        excerpt: [
          "In the event Your Car is involved in an Accident and gives rise to a claim, Your Car must be brought to an Etiqa authorised workshop selected and approved by Us for repairs. Failure to do so, We reserve the right to decline liability under Section I of the Policy.",
          "If Your Policy is under Comprehensive Any Workshop plan as set out in the Schedule, the excess shall be reduced by S$500, provided that Your Car is repaired at Our Authorised Workshop.",
        ],
      },
      unnamedDriver: {
        summary: "S$4,000 under 27, over 75 or licence under 2 years; S$1,000 other unnamed drivers",
        page: 17,
        section: "Endorsements No. M2U (page 16) and MDP (page 17)",
        excerpt: [
          "M2U – Unnamed Driver Excess: In addition to the excess amount specified in the Policy Schedule, an additional excess of S$1,000 shall apply for Unnamed Driver(s) … This additional excess applies only to Unnamed Driver(s) who are aged twenty-seven (27) years or older, and seventy-five (75) years or younger, or who have a minimum of two (2) years of driving experience in Singapore.",
          "MDP – Young, Elderly And/Or Inexperienced Driver (YEID) Excess: In addition to the excess amount specified in the Policy Schedule, an additional excess of S$4,000 shall apply for the YEID Unnamed Driver(s) … YEID Unnamed Driver(s) is defined as Unnamed Driver(s): (a) who is below twenty-seven (27) years old; (b) who is above seventy-five (75) years old; and/or (c) who has held a full driving license for less than two (2) years.",
        ],
        note: "Both are endorsements that apply when shown on your Schedule.",
      },
      windscreen: {
        summary: "S$100 to replace · S$0 to repair · NCD unaffected",
        page: 17,
        section: "Endorsement No. M89P · Breakage of Glass in Windscreen or Window",
        excerpt: [
          "You will need to pay an excess of S$100 if Your Car’s Windscreen is being replaced. You do not have to pay any excess, if the Windscreen is being repaired. This claim shall not affect your NCD.",
        ],
      },
      ncdScale: {
        summary: "50%→20% · 40%→10% · 10–30%→0% · 2+ claims→0%",
        page: 15,
        section: "No Claims Discount (NCD) · (b) Reduction In NCD",
        excerpt: [
          "Your NCD for the next Period of Insurance will be reduced if one (1) or more claims have occurred during a Period of Insurance:",
        ],
        table: {
          headers: ["Current NCD", "If 1 claim is made", "If 2 or more claims are made"],
          rows: [
            ["50%", "20%", "0%"],
            ["40%", "10%", "0%"],
            ["10% - 30%", "0%", "0%"],
          ],
        },
      },
      ncdProtector: {
        summary: "From 30% NCD · keeps NCD after 1 claim",
        page: 9,
        section: "Optional Benefits, 1 · NCD Protector (applicable for 30% onwards)",
        excerpt: [
          "If You are entitled to 30%, 40% or 50% NCD, in the event there is one (1) claim made against Your policy within the Period of Insurance, You will be allowed to retain Your NCD. If a second or more claims are made, the normal NCD rules will apply and Your entitlement will be reduced by 30% NCD on renewal with Us.",
        ],
        table: {
          headers: ["Current NCD", "If 1 claim", "If 2 claims", "If 3 or more claims"],
          rows: [
            ["30%", "30%", "0%", "0%"],
            ["40%", "40%", "10%", "0%"],
            ["50%", "50%", "20%", "0%"],
          ],
        },
      },
    },
  },
  {
    id: "directasia",
    calculatorInsurer: null,
    insurer: "DirectAsia",
    document: "Motor Car Insurance Policy Wording",
    version: "SGMotorCarAllVers7 · 01 Jul 2026",
    pdfFile: "/policies/directasia_motor_car_policy.pdf",
    entries: {
      ownDamageExcess: {
        summary: "Amount on your Schedule and Certificate · excesses are cumulative",
        page: 4,
        section: "Your Policy",
        excerpt: ["Applicable excess are shown on your certificate of insurance and your policy schedule."],
        note: "The wording sets no own-damage amount. Page 18 defines excess as cumulative: “These amounts are cumulative and the total cumulative excess is payable by you.”",
      },
      workshop: {
        summary: "Approved workshops only, unless the My Workshop benefit is bought",
        page: 6,
        section: "Section 1 · Your Vehicle, clause 3",
        excerpt: [
          "If you are insured under the My Workshop benefit, you will be allowed to repair your vehicle at any workshop in Singapore. Otherwise, your vehicle must be repaired at our list of approved workshop to claim under this policy.",
        ],
        note: "My Workshop is an optional benefit for Comprehensive and Third Party, Fire and Theft cover (page 7).",
      },
      unnamedDriver: {
        summary: "S$2,500 under 30 or licence under 2 years (Flexible plan)",
        page: 6,
        section: "Section 1 · Your Vehicle, clause 6",
        excerpt: [
          "If your policy is under Flexible plan, the following excess will apply to each and every claim under this section, depending on the driver at the time of accident:",
        ],
        table: {
          headers: ["Driver", "Excess"],
          rows: [
            ["Young and/or inexperienced driver", "$2,500"],
            ["Any authorised driver who is not Young and/or inexperienced", "As per own damage excess in the policy schedule."],
          ],
        },
        note: "Page 19 defines a young and/or inexperienced driver as one who “is below the age of 30; or holds a driving licence for less than 2 years.” The Value and Value Plus plans restrict who may drive instead (page 4).",
      },
      windscreen: {
        summary: "Schedule excess applies · approved workshop · NCD unaffected",
        page: 6,
        section: "Section 1 · Your Vehicle, clause 5",
        excerpt: [
          "If only windscreen of your vehicle is damaged due to an accident, we will pay the cost of replacement or repair as long as: a. you inform us before any repairs or replacement of your windscreen; b. repair is authorised by us and are carried out at the approved workshop.",
          "Your windscreen claim will not affect your No Claim Discount, however, the excess shown in your policy schedule will apply for each and every claim.",
        ],
      },
      ncdScale: {
        summary: "60% or 50%→20% · 40%→10% · 30% and under→0% · 2+ claims→0%",
        page: 13,
        section: "General Information, clause 2 · No Claim Discount (NCD)",
        excerpt: [
          "If there are claims made against your policy, we will reduce the No Claim Discount as follows:",
          "Without the optional no claim discount protector plus cover;",
        ],
        table: {
          headers: ["Entitled current NCD", "1 claim", "2 or more claims"],
          rows: [
            ["60%", "20%", "0%"],
            ["50%", "20%", "0%"],
            ["40%", "10%", "0%"],
            ["0-30%", "0%", "0%"],
          ],
        },
        note: "The same page adds a 60% tier for five years of consecutive 50% NCD, and an extra 10% reduction if an accident is not reported within 24 hours or by the next working day.",
      },
      ncdProtector: {
        summary: "From 30% NCD · one claim does not reduce NCD",
        page: 9,
        section: "Optional Benefits, 7 · No Claim Discount Protector Plus",
        excerpt: [
          "This benefit is available to you if your current No Claim Discount entitlement is 30%, 40% or 50% and your vehicle continues to be insured by us.",
          "We will retain your current No Claim Discount entitlement if you make no more than one claim during the period of insurance. However, No Claim Discount will be reduced from the second claim.",
        ],
        table: {
          headers: ["Entitled current NCD", "1 claim (NCD Protector plus)", "2 claims", "3 or more claims"],
          rows: [
            ["60%", "60%", "20%", "0%"],
            ["50%", "50%", "20%", "0%"],
            ["40%", "50%", "10%", "0%"],
            ["30%", "40%", "0%", "0%"],
          ],
        },
        note: "The table is on page 13. It shows the NCD still stepping up after one protected claim (40% to 50%, 30% to 40%).",
      },
    },
  },
];

/** Insurers modelled by the calculator for which no policy wording is bundled. */
export const INSURERS_WITHOUT_WORDING = ["FWD Singapore"];

export function wordingPageUrl(wording, page) {
  return page ? `${wording.pdfFile}#page=${page}&view=FitH` : wording.pdfFile;
}

export function findWording(id) {
  return POLICY_WORDINGS.find((wording) => wording.id === id) ?? null;
}

export function findTopicBySlug(slug) {
  return WORDING_TOPICS.find((topic) => topic.slug === slug) ?? null;
}

/** Public route for one insurer's wording on one topic. */
export function wordingTopicPath(wording, topic) {
  return `/rules/${wording.id}/${topic.slug}`;
}

/** Public route comparing every bundled wording on one topic. */
export function topicComparisonPath(topic) {
  return `/rules/compare/${topic.slug}`;
}

/** The calculator that prices the decision a wording topic affects. */
export function topicToolPath(topic) {
  return topic.id === "ncdProtector" ? "/tools/ncd-protector" : "/calculator";
}
