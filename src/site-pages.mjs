import {
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  topicComparisonPath,
  wordingTopicPath,
} from "./policy-wordings.mjs";

/**
 * Public, indexable pages. The sitemap and llms.txt are both generated from this list,
 * so a page added here is announced to search engines and AI crawlers together.
 */
export const CORE_PAGES = [
  { path: "/", group: "Start", title: "Home", description: "Car-ownership decisions in Singapore by stage, with worked examples." },
  { path: "/tools", group: "Start", title: "All car tools", description: "Every calculator and feature on one page." },
  { path: "/calculator", group: "Calculators", title: "Claim or self-pay calculator", description: "After an accident, compares claiming with paying the workshop directly, counting excess and NCD loss over future renewals." },
  { path: "/tools/ncd-protector", group: "Calculators", title: "NCD Protector calculator", description: "The yearly claim chance at which the NCD Protector rider pays for itself." },
  { path: "/tools/quote-compare", group: "Calculators", title: "Renewal quote comparison", description: "Ranks renewal quotes by premium plus the real cost of an accident: excess, workshop surcharge, and NCD loss." },
  { path: "/tools/coe-renewal", group: "Calculators", title: "COE renewal calculator", description: "Yearly cost of a 5-year renewal, a 10-year renewal, or replacing the car, with rebates and road tax surcharges." },
  { path: "/tools/loan-prepayment", group: "Calculators", title: "Car loan early settlement", description: "Rule of 78 early settlement amount compared with what the cash could earn elsewhere." },
  { path: "/tools/ownership-cost", group: "Calculators", title: "True cost of owning a car", description: "Monthly cost of a car: depreciation after COE and PARF, loan interest, road tax, insurance, energy, and parking." },
  { path: "/accident", group: "After an accident", title: "After an accident", description: "When to call the police, whether to claim, and how to settle privately." },
  { path: "/emergency", group: "After an accident", title: "Offline emergency checklist", description: "Step-by-step accident checklist that works without a connection." },
  { path: "/settlement", group: "After an accident", title: "Private settlement agreement", description: "Printable agreement for a minor accident with no injuries, for both drivers to sign." },
  { path: "/rules", group: "Insurer rules", title: "Insurer rules", description: "Verbatim policy wording from Singapore motor insurers, each linked to its source page." },
  { path: "/my-car", group: "Account", title: "My Car", description: "Save insurance, COE, and loan dates to prefill tools and get email reminders before each decision." },
  { path: "/how-it-works", group: "About", title: "How it works", description: "The NCD, break-even, and discounting methods behind every calculator." },
  { path: "/privacy", group: "About", title: "Privacy", description: "What is stored, where, and for how long." },
];

/** Every generated insurer-rules page, with the date its source wording was checked. */
export function wordingPages() {
  const insurerPages = POLICY_WORDINGS.map((wording) => ({
    path: `/rules/${wording.id}`,
    group: "Insurer rules",
    title: `${wording.insurer} car insurance rules`,
    description: `Every topic from the ${wording.insurer} ${wording.document} (${wording.version}).`,
    lastModified: WORDINGS_REVIEWED_ON,
  }));
  const topicPages = WORDING_TOPICS.map((topic) => ({
    path: topicComparisonPath(topic),
    group: "Insurer rules",
    title: `${topic.title}: insurers compared`,
    description: topic.question,
    lastModified: WORDINGS_REVIEWED_ON,
  }));
  const clausePages = POLICY_WORDINGS.flatMap((wording) =>
    WORDING_TOPICS.map((topic) => ({
      path: wordingTopicPath(wording, topic),
      group: "Insurer rules",
      title: `${wording.insurer}: ${topic.title}`,
      description: wording.entries[topic.id].summary,
      lastModified: WORDINGS_REVIEWED_ON,
    }))
  );
  return [...insurerPages, ...topicPages, ...clausePages];
}

export function allPublicPages() {
  return [...CORE_PAGES, ...wordingPages()];
}
