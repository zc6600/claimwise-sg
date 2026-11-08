/**
 * Maps calculator audit items to the matching location in the official local PDF.
 * Page numbers are physical PDF page numbers (1-based), not printed folio numbers.
 * Schedules and endorsements vary by policyholder; the preview must never imply
 * that the PDF contains a personalized schedule or that every plan has the same terms.
 */
export function getClausePdfInfo(clauseId, insurer = "income") {
  const normInsurer = (insurer || "income").toLowerCase();
  const sources = {
    etiqa: {
      pdfFile: "/policies/etiqa_tiq_motor_policy.pdf",
      docName: "Etiqa Private Car Insurance Policy Wording · V19 (February 2026)",
      pages: {
        base_excess: [16, "Excess All Claims / Own Damage Claims endorsements; amount is in the policy schedule"],
        effective_excess: [16, "Excess endorsements; check the schedule for amounts"],
        workshop_surcharge: [19, "Authorised Workshop Scheme and authorised-workshop excess reduction"],
        young_driver_excess: [17, "Young, Elderly and/or Inexperienced Driver excess endorsement"],
        windscreen_clause: [17, "Windscreen replacement/repair excess and NCD treatment"],
        ncd_step_down: [15, "No Claims Discount reduction table"],
        ncd_protector_rider: [9, "NCD Protector optional benefit and claim-count table"],
        third_party_liability: [6, "Section II · Legal Liability to Third Parties"],
        actuarial_model: [15, "NCD table used as model input; the calculation itself is not in the policy"],
      },
    },
    msig: {
      pdfFile: "/policies/msig_motormax_policy.pdf",
      docName: "MSIG MotorMax Policy",
      pages: {
        base_excess: [5, "Section I excess; the policy excess amount is stated in the schedule"],
        effective_excess: [5, "Section I excess; check schedule and applicable endorsements"],
        workshop_surcharge: [19, "Compulsory Authorised Workshop Usage endorsement"],
        young_driver_excess: [5, "Young and/or Inexperienced Driver Excess (under 23 or licence under 2 years)"],
        windscreen_clause: [4, "Windscreen/window glass cover, S$100 replacement excess, repair waiver and NCD treatment"],
        ncd_step_down: [11, "No Claim Discount accident/non-reporting scale"],
        ncd_protector_rider: [11, "NCD scale only; protector terms are not in this base wording and must be checked in the schedule/rider"],
        third_party_liability: [5, "Section II · Liability to Third Parties"],
        actuarial_model: [11, "NCD table used as model input; the calculation itself is not in the policy"],
      },
    },
    income: {
      pdfFile: "/policies/income_drivo_policy.pdf",
      docName: "Income Drivo Private Car Policy Conditions (September 2026)",
      pages: {
        base_excess: [1, "Plan summary: policy excess as stated in the schedule/certificate"],
        effective_excess: [1, "Plan summary: policy and additional excesses; check the schedule/certificate"],
        workshop_surcharge: [1, "Plan summary: workshop options by plan; no universal S$1,000 surcharge stated"],
        young_driver_excess: [1, "Plan summary: unnamed-driver excess age/experience conditions"],
        windscreen_clause: [1, "Plan summary: windscreen excess and cover"],
        ncd_step_down: [7, "No-claim discount reduction table"],
        ncd_protector_rider: [1, "Plan summary lists NCD Protector; rider terms and eligibility must be checked in the schedule"],
        third_party_liability: [4, "Section 2 · Your legal responsibility to other people"],
        actuarial_model: [7, "NCD table used as model input; the calculation itself is not in the policy"],
      },
    },
  };

  const source = sources[normInsurer];
  const location = source?.pages[clauseId];
  if (!source || !location) return null;

  const [page, section] = location;
  return {
    pdfFile: source.pdfFile,
    page,
    docName: source.docName,
    label: `${section} · PDF page ${page}`,
    anchorUrl: `${source.pdfFile}#page=${page}&view=FitH`,
    section,
  };
}
