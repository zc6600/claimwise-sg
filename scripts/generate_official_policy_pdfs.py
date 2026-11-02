#!/usr/bin/env python
"""
Deprecated: this script generated fabricated policy-like documents. Official source
PDFs are maintained directly in public/policies/ and must not be regenerated here.
"""

import os

def create_multipage_pdf(filepath, title, insurer, pages_data):
    """
    Creates a standard, valid PDF-1.4 file with multiple pages,
    official letterhead, headers, and formatted legal clauses.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # We will build standard PDF objects
    num_pages = len(pages_data)
    
    # Objects list (1-indexed)
    # obj 1: Catalog
    # obj 2: Pages root
    # obj 3: Font Helvetica
    # obj 4: Font Helvetica-Bold
    # obj 5: Font Courier (for references)
    # For each page i (0 to num_pages-1):
    #   obj 6 + 2*i: Page object
    #   obj 7 + 2*i: Content stream object
    
    page_obj_start = 6
    kids_refs = " ".join([f"{page_obj_start + 2*i} 0 R" for i in range(num_pages)])
    
    objects = []
    
    # Obj 1: Catalog
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    
    # Obj 2: Pages
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids_refs}] /Count {num_pages} >>\nendobj")
    
    # Obj 3: Helvetica
    objects.append("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")
    
    # Obj 4: Helvetica-Bold
    objects.append("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj")
    
    # Obj 5: Courier
    objects.append("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj")
    
    def escape_text(text):
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    
    for i, pdata in enumerate(pages_data):
        page_num = i + 1
        page_obj_id = page_obj_start + 2*i
        stream_obj_id = page_obj_id + 1
        
        # Build stream commands
        stream_cmds = []
        
        # Background page border
        stream_cmds.append("0.85 0.90 0.92 rg 30 30 535 782 re S") # outer border
        
        # Header banner
        stream_cmds.append("0.05 0.35 0.35 rg 30 772 535 40 re f") # teal banner
        stream_cmds.append("BT /F2 13 Tf 1 1 1 rg 45 788 Td (REPUBLIC OF SINGAPORE - OFFICIAL INSURANCE POLICY WORDING) Tj ET")
        stream_cmds.append(f"BT /F1 9 Tf 1 1 1 rg 440 788 Td (Page {page_num} of {num_pages}) Tj ET")
        
        # Insurer & Policy title
        stream_cmds.append(f"BT /F2 16 Tf 0.05 0.20 0.25 rg 45 740 Td ({escape_text(pdata.get('header', title))}) Tj ET")
        stream_cmds.append(f"BT /F1 10 Tf 0.40 0.45 0.50 rg 45 724 Td ({escape_text(pdata.get('sub', insurer + ' · MAS Regulated Insurer'))}) Tj ET")
        stream_cmds.append("0.8 0.8 0.8 RG 45 714 m 520 714 l S") # separator line
        
        # Section Heading
        sec_title = pdata.get("section", f"SECTION {page_num}")
        stream_cmds.append(f"BT /F2 12 Tf 0.05 0.45 0.40 rg 45 690 Td ({escape_text(sec_title)}) Tj ET")
        
        y_cursor = 665
        
        # Body paragraphs
        paragraphs = pdata.get("body", [])
        for para in paragraphs:
            is_highlight = para.startswith("[HIGHLIGHT]")
            if is_highlight:
                para_clean = para.replace("[HIGHLIGHT]", "").strip()
                # Draw yellow highlight background box
                stream_cmds.append(f"1.0 0.98 0.88 rg 42 {y_cursor - 5} 510 52 re f")
                stream_cmds.append(f"0.85 0.55 0.10 RG 42 {y_cursor - 5} 510 52 re S")
                stream_cmds.append(f"BT /F2 10 Tf 0.50 0.25 0.05 rg 50 {y_cursor + 28} Td (>>> OFFICIAL CONTRACT MANDATE:) Tj ET")
                # Wrap text roughly into 2 lines
                words = para_clean.split()
                line1 = " ".join(words[:12])
                line2 = " ".join(words[12:])
                stream_cmds.append(f"BT /F2 9.5 Tf 0.40 0.15 0.02 rg 50 {y_cursor + 14} Td ({escape_text(line1)}) Tj ET")
                if line2:
                    stream_cmds.append(f"BT /F2 9.5 Tf 0.40 0.15 0.02 rg 50 {y_cursor + 1} Td ({escape_text(line2)}) Tj ET")
                y_cursor -= 68
            else:
                stream_cmds.append(f"BT /F1 9.5 Tf 0.20 0.25 0.30 rg 45 {y_cursor} Td ({escape_text(para)}) Tj ET")
                y_cursor -= 22
        
        # Watermark
        stream_cmds.append("BT /F2 36 Tf 0.93 0.95 0.95 rg 100 400 Td (OFFICIAL POLICY CONTRACT) Tj ET")
        
        # Footer
        stream_cmds.append("0.85 0.85 0.85 RG 45 60 m 520 60 l S")
        stream_cmds.append("BT /F1 8 Tf 0.55 0.60 0.65 rg 45 46 Td (General Insurance Association of Singapore (GIA) MCF Approved · Subject to Singapore High Court Jurisdiction) Tj ET")
        stream_cmds.append(f"BT /F3 8 Tf 0.05 0.45 0.40 rg 440 46 Td (DOC-VERIFIED) Tj ET")
        
        stream_content = "\n".join(stream_cmds)
        stream_len = len(stream_content.encode("utf-8"))
        
        # Page object
        page_obj = f"{page_obj_id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents {stream_obj_id} 0 R >>\nendobj"
        objects.append(page_obj)
        
        # Stream object
        stream_obj = f"{stream_obj_id} 0 obj\n<< /Length {stream_len} >>\nstream\n{stream_content}\nendstream\nendobj"
        objects.append(stream_obj)
    
    # Now write complete PDF with xref table
    offsets = []
    current_pos = 0
    header_line = "%PDF-1.4\n"
    current_pos += len(header_line.encode("utf-8"))
    
    pdf_body = []
    pdf_body.append(header_line)
    
    for obj in objects:
        offsets.append(current_pos)
        obj_bytes = (obj + "\n").encode("utf-8")
        current_pos += len(obj_bytes)
        pdf_body.append(obj + "\n")
    
    xref_pos = current_pos
    num_total_objs = len(objects) + 1
    
    xref_lines = []
    xref_lines.append(f"xref\n0 {num_total_objs}\n0000000000 65535 f \n")
    for off in offsets:
        xref_lines.append(f"{off:010d} 00000 n \n")
    
    trailer = f"trailer\n<< /Size {num_total_objs} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    
    with open(filepath, "wb") as f:
        f.write("".join(pdf_body).encode("utf-8"))
        f.write("".join(xref_lines).encode("utf-8"))
        f.write(trailer.encode("utf-8"))
    
    print(f"Generated {filepath}: {num_pages} pages, {os.path.getsize(filepath)} bytes")

def main():
    print("Deprecated: refusing to overwrite official policy source PDFs.")
    return
    
    # 1. Etiqa Tiq Motor Policy (12 Pages)
    etiqa_pages = [
        {
            "header": "Tiq Motor Insurance — Comprehensive Policy Wording",
            "sub": "Etiqa Insurance Pte. Ltd. · Policy Ref: TIQ-MOTOR-COMP-2024",
            "section": "POLICY OVERVIEW & GENERAL CONDITIONS",
            "body": [
                "This Policy is issued by Etiqa Insurance Pte. Ltd., a licensed general insurer under the Insurance Act 1966.",
                "The proposal form, declaration, and Policy Schedule form the basis of this contract of insurance.",
                "Cover is operative in the Republic of Singapore, West Malaysia, and within 80km of the Thai border.",
                "Please read all sections carefully to understand your rights, duties, and applicable excess schedules."
            ]
        },
        {
            "header": "Tiq Motor Insurance — Definitions",
            "sub": "Section 0 · Contractual Definitions",
            "section": "SECTION 0 — INTERPRETATION OF TERMS",
            "body": [
                "'Authorised Driver' means the Policyholder or any person driving with the Policyholder's consent.",
                "'Authorised Workshop' means a repairer designated and appointed by Etiqa under the Tiq Panel Network.",
                "'Excess' means the first amount of each claim that must be borne by the Policyholder out-of-pocket.",
                "'No Claim Discount (NCD)' means the premium discount accrued according to GIA industry regulations."
            ]
        },
        {
            "header": "Tiq Motor Insurance — Coverage Scope",
            "sub": "Section 1 · Own Damage Loss or Damage Scope",
            "section": "SECTION 1 — LOSS OF OR DAMAGE TO YOUR VEHICLE",
            "body": [
                "Etiqa will indemnify you against loss or damage to the Insured Vehicle and its accessories.",
                "Covered perils include accidental collision, overturning, fire, external explosion, lightning, and theft.",
                "Etiqa may at its option repair, reinstate or replace the vehicle or pay cash settlement.",
                "All repairs are subject to the Deductible Schedule specified in your Policy Schedule."
            ]
        },
        {
            "header": "Tiq Motor Policy — Basic Policy Excess (Page 4)",
            "sub": "Section 1 · Clause 1.1 Policy Deductibles",
            "section": "CLAUSE 1.1 — STANDARD BASIC POLICY EXCESS",
            "body": [
                "In respect of each accident resulting in a claim under Section 1, the Policyholder must pay the Basic Excess.",
                "[HIGHLIGHT]Clause 1.1: The Policyholder shall bear the basic excess specified in the Schedule for each claim. If the total repair cost does not exceed this excess, no insurance indemnity is payable.",
                "The Basic Excess applies before any indemnity is disbursed by Etiqa to repair facilities.",
                "Where cumulative endorsement excesses apply, they are added on top of the Basic Excess."
            ]
        },
        {
            "header": "Tiq Motor Policy — Authorised Workshop Condition (Page 5)",
            "sub": "Part 1 · Clause 4.2 Non-Authorised Workshop Surcharge",
            "section": "PART 1, CLAUSE 4.2 — NON-AUTHORISED WORKSHOP EXCESS",
            "body": [
                "Repairs must be carried out at a Tiq Authorised Workshop to maintain policy terms and parts guarantees.",
                "[HIGHLIGHT]Clause 4.2: All accident repairs must be carried out at Tiq Authorised Workshops. If repaired at a non-authorised workshop, an additional Non-Authorised Workshop Excess of S$2,000 applies per claim.",
                "Repairs at Tiq Authorised Workshops enjoy a 12-month workmanship guarantee on replaced parts.",
                "Failure to report to an authorised reporting centre within 24 hours breaches GIA MCF rules."
            ]
        },
        {
            "header": "Tiq Motor Policy — Young & Inexperienced Driver Excess (Page 6)",
            "sub": "Table of Excesses · Clause 5 Driver Surcharges",
            "section": "CLAUSE 5 — YOUNG AND INEXPERIENCED DRIVER SURCHARGE",
            "body": [
                "The additional excess in this clause applies cumulatively with the Basic Excess and Workshop Excess.",
                "[HIGHLIGHT]Clause 5: An additional excess of S$2,000 applies if the vehicle is driven by or in charge of any person aged under 25 years or holding a driving licence for less than 2 years at the accident time.",
                "This excess applies whether the driver is a named driver or an unnamed authorized driver.",
                "If the driver is both under 25 and has held a license for under 2 years, only one S$2,000 excess is charged."
            ]
        },
        {
            "header": "Tiq Motor Policy — Windscreen Glass Cover (Page 7)",
            "sub": "Part 1 · Windscreen Endorsement W1",
            "section": "WINDSCREEN AND WINDOW GLASS REPLACEMENT ENDORSEMENT",
            "body": [
                "Section 1 is extended to cover breakage of windscreen glass and window glass of the vehicle.",
                "[HIGHLIGHT]Windscreen Clause: Reinstatement or replacement of windscreen glass is subject to an excess of S$100. Any claim made under this clause shall NOT affect your accrued No Claim Discount (NCD).",
                "If the windscreen is repaired with resin rather than replaced, the S$100 excess is waived completely (S$0).",
                "Cover is reinstated automatically after settlement for any subsequent glass breakage."
            ]
        },
        {
            "header": "Tiq Motor Policy — NCD Protector Rider (Page 8)",
            "sub": "Optional Endorsement · NCD Protection Guarantee",
            "section": "NCD PROTECTOR ENDORSEMENT GUARANTEE",
            "body": [
                "Available to policyholders with 40% or 50% No Claim Discount at the start of the policy year.",
                "[HIGHLIGHT]NCD Protector Clause: Etiqa agrees that your accrued NCD will not be reduced by reason of one at-fault claim made during the policy period. Your NCD tier is preserved upon renewal.",
                "A second at-fault claim within the same period of insurance will trigger the standard GIA 30% reduction.",
                "NCD Protector does not transfer automatically to another insurer unless approved under GIA transfer rules."
            ]
        },
        {
            "header": "Tiq Motor Policy — Third-Party Liability (Page 9)",
            "sub": "Section 2 · Statutory Liability to Third Parties",
            "section": "SECTION 2 — LIABILITY TO THIRD PARTIES",
            "body": [
                "Indemnifies you against legal liability for accidental death or bodily injury to third parties (unlimited).",
                "Indemnifies you against legal liability for damage to third-party property up to S$5,000,000.",
                "[HIGHLIGHT]Statutory Settlement: If a third party claims against you and you bear liability, Etiqa is obligated by law to settle. This settlement docks your NCD even if you self-pay your own vehicle repair.",
                "Etiqa will conduct legal defense and dispute negotiations in your name under Singapore tort law."
            ]
        },
        {
            "header": "Tiq Motor Policy — General Exceptions (Page 10)",
            "sub": "Section 3 · Policy Exclusions",
            "section": "SECTION 3 — GENERAL EXCEPTIONS & EXCLUSIONS",
            "body": [
                "The Company shall not be liable in respect of any accident occurring outside the geographical limits.",
                "No cover applies if the vehicle is driven by any person under the influence of alcohol or intoxicating drugs.",
                "Wear, tear, mechanical breakdown, and electrical failure are excluded under own-damage cover.",
                "Racing, pace-making, reliability trials, and speed testing are strictly excluded."
            ]
        }
    ]
    
    create_multipage_pdf("public/policies/etiqa_tiq_motor_policy.pdf", "Tiq Motor Comprehensive Policy", "Etiqa Insurance", etiqa_pages)
    
    # 2. Income Drivesafe Policy (8 Pages)
    income_pages = [
        {
            "header": "Income Drivesafe Motor Policy — Schedule",
            "sub": "Income Insurance Limited · Policy Ref: INCOME-DS-2024",
            "section": "POLICY SCHEDULE & INSURING AGREEMENT",
            "body": [
                "Income Insurance Limited agrees to insure you against accidental loss of or damage to your motor vehicle.",
                "This policy is subject to the Insurance Act 1966 and Singapore General Insurance regulations.",
                "Repairs must be carried out in the Republic of Singapore under the Quality Workshop Scheme.",
                "Read your Policy Schedule for specific named driver terms, sum insured, and basic excesses."
            ]
        },
        {
            "header": "Income Drivesafe — Basic Policy Excess (Page 2)",
            "sub": "Section 1 · Basic Excess Terms",
            "section": "SECTION 1 — BASIC POLICY EXCESS",
            "body": [
                "Income will pay the cost of repairing covered accidental damage subject to deductible rules.",
                "[HIGHLIGHT]Section 1 Basic Excess: In respect of each accident, you shall bear the standard basic excess stated in the Schedule before Income pays covered repair costs. If repairs are below excess, payout is S$0.",
                "The basic excess is borne by the policyholder at the time of vehicle collection from the workshop.",
                "Additional endorsement excesses are cumulative and apply in addition to the basic excess."
            ]
        },
        {
            "header": "Income Drivesafe — Quality Workshop Scheme (Page 3)",
            "sub": "Endorsement 101 · Non-Authorised Workshop Surcharge",
            "section": "ENDORSEMENT 101 — QUALITY WORKSHOP SCHEME",
            "body": [
                "This endorsement applies to all private car policies under the Quality Workshop discount plan.",
                "[HIGHLIGHT]Endorsement 101: Repairs must be carried out at an Income Quality Workshop. If the vehicle is repaired at an unauthorised workshop, an additional excess of S$1,000 applies to each claim.",
                "Income Quality Workshops provide a 12-month repair craftsmanship and replacement parts warranty.",
                "Income reserves the right to decline unauthorized workshops with substandard equipment."
            ]
        },
        {
            "header": "Income Drivesafe — Young Driver Excess (Page 4)",
            "sub": "Clause 3(b) · Table of Additional Excesses",
            "section": "CLAUSE 3(b) — YOUNG AND INEXPERIENCED DRIVER EXCESS",
            "body": [
                "Demographic risk rating requires cumulative excess for younger and newly-licensed drivers.",
                "[HIGHLIGHT]Clause 3(b): An additional excess of S$2,500 applies if the vehicle is driven by any person aged under 25 years or holding a valid driving licence for less than 2 years at the accident time.",
                "This excess applies to both named drivers and authorized unnamed drivers across all own-damage claims.",
                "If the driver is under 25 and has a license for under 2 years, only one S$2,500 excess is levied."
            ]
        },
        {
            "header": "Income Drivesafe — Windscreen Replacement (Page 5)",
            "sub": "Endorsement W1 · Windscreen & Window Glass",
            "section": "ENDORSEMENT W1 — WINDSCREEN REPLACEMENT COVER",
            "body": [
                "Extends Section 1 to cover damage to the windscreen and window glass of your vehicle.",
                "[HIGHLIGHT]Endorsement W1: Payment of S$100 excess applies for windscreen replacement. Replacement or repair under this endorsement shall NOT affect your accrued No Claim Discount (NCD).",
                "If the windscreen crack is repaired without replacing the glass, the S$100 excess is waived.",
                "Cover is reinstated automatically for subsequent windscreen glass breakages."
            ]
        },
        {
            "header": "Income Drivesafe — NCD Protector (Page 6)",
            "sub": "Endorsement 50 · NCD Protection Rider",
            "section": "ENDORSEMENT 50 — NCD PROTECTOR BENEFIT",
            "body": [
                "Protects your 50% No Claim Discount against forfeiture upon an at-fault accident.",
                "[HIGHLIGHT]Endorsement 50: Income agrees that your 50% NCD will not be reduced upon the first at-fault own-damage claim within the policy period. Your renewal premium preserves the 50% tier.",
                "If a second claim occurs within the same policy year, the standard GIA 30% reduction applies.",
                "NCD Protector cannot be transferred to a new insurer unless approved under GIA inter-insurer rules."
            ]
        },
        {
            "header": "Income Drivesafe — Third-Party Liability (Page 7)",
            "sub": "Section 2 · Legal Liability to External Parties",
            "section": "SECTION 2 — LIABILITY TO THIRD PARTIES",
            "body": [
                "Covers statutory third-party risks under the Motor Vehicles (Third-Party Risks and Compensation) Act.",
                "[HIGHLIGHT]Condition 1(c): Where a third party claims against you and liability is established, Income must settle. This settlement triggers a 30% NCD drop regardless of whether you self-pay your car.",
                "100% non-fault accidents subrogated under GIA Knock-for-Knock rules do not affect your NCD.",
                "Report all accidents within 24 hours to prevent prejudice to your legal defense."
            ]
        }
    ]
    
    create_multipage_pdf("public/policies/income_drivesafe_policy.pdf", "Income Drivesafe Motor Policy", "Income Insurance", income_pages)
    
    # 3. GIA Motor Claims Framework (6 Pages)
    gia_pages = [
        {
            "header": "GIA Motor Claims Framework (MCF) — Operating Guide",
            "sub": "General Insurance Association of Singapore · Official Industry Standard",
            "section": "GIA MCF — SECTION 1: ACCIDENT REPORTING PROTOCOL",
            "body": [
                "The Motor Claims Framework (MCF) is the standard industry protocol established by GIA for Singapore.",
                "All motorists involved in a traffic accident must report within 24 hours or the next working day.",
                "Failure to report breaches policy conditions and can result in the loss of your No-Claim Discount.",
                "Reporting your accident does not mean you must file an insurance claim."
            ]
        },
        {
            "header": "GIA MCF — Standard Scale of NCD (Page 2)",
            "sub": "Section 2 · Industry Standard NCD Scale & Deductions",
            "section": "SECTION 2 — NO-CLAIM DISCOUNT (NCD) STEP-DOWN SCALE",
            "body": [
                "The No-Claim Discount is calculated according to the GIA standard scale across all member insurers.",
                "[HIGHLIGHT]Standard GIA Scale: Making one at-fault claim reduces your NCD by 30%: 50% drops to 20%; 40% drops to 10%; 30% or below drops to 0%. Each claim-free year recovers 10% upon renewal.",
                "A 50% NCD holder takes exactly 3 consecutive claim-free renewal cycles to recover back to 50%.",
                "Your NCD record is maintained on the centralized GIA NCD Database and recognized across all insurers."
            ]
        },
        {
            "header": "GIA MCF — Knock-for-Knock Subrogation Agreement (Page 3)",
            "sub": "Section 3 · Inter-Insurer Subrogation Rules",
            "section": "SECTION 3 — KNOCK-FOR-KNOCK PROTOCOLS & SUBROGATION",
            "body": [
                "Governs accident disputes between insured vehicles under Singapore General Insurance Bar agreements.",
                "[HIGHLIGHT]Clause 3.1 Subrogation: Where you are established to be 100% non-fault, your insurer recovers all repair outlays from the adverse third party. Your NCD is completely preserved (0% reduction).",
                "In 50-50 partial liability cases, both insurers bear own repair costs and NCD is docked on both sides.",
                "Maintain dashcam footage, photographs, and witness particulars to support non-fault recovery."
            ]
        },
        {
            "header": "GIA MCF — Third-Party Settlement Impact (Page 4)",
            "sub": "Section 1.1 · Condition 1(c) Statutory Claims",
            "section": "SECTION 1.1 — THIRD-PARTY CLAIMS & SELF-PAY IMPLICATIONS",
            "body": [
                "Clarifies the legal interaction between own-damage private settlements and adverse claims.",
                "[HIGHLIGHT]Section 1.1: If the other party lodges a claim against your policy and you bear liability, your insurer must settle. This settlement docks your NCD even if you choose to self-pay your car.",
                "Private settlement forms (GIA Private Settlement Form) must clearly record full and final discharge.",
                "Consult your insurer before signing any private settlement agreement with third parties."
            ]
        }
    ]
    
    create_multipage_pdf("public/policies/gia_motor_claims_framework.pdf", "GIA Motor Claims Framework", "GIA Singapore", gia_pages)

    # 4. MSIG MotorMax Policy (7 Pages)
    msig_pages = [
        {
            "header": "MSIG MotorMax Comprehensive Policy Wording",
            "sub": "MSIG Insurance (Singapore) Pte. Ltd. · Policy Ref: MSIG-MOTORMAX-2024",
            "section": "POLICY OVERVIEW & GENERAL CONDITIONS",
            "body": [
                "MSIG Insurance (Singapore) Pte. Ltd. agrees to indemnify the Insured in accordance with policy terms.",
                "Cover operates within the Republic of Singapore, West Malaysia, and within 80km of the Thai border.",
                "This policy is subject to the Insurance Act 1966 and the General Insurance Association code of practice.",
                "Review the Schedule of Excesses to understand deductibles applicable to own-damage claims."
            ]
        },
        {
            "header": "MSIG MotorMax — Section 1 Own Damage Excess (Page 2)",
            "sub": "Section 1 · Own Damage Deductible Schedule",
            "section": "SECTION 1 — INSURANCE ON THE MOTOR VEHICLE",
            "body": [
                "MSIG will indemnify the Insured against accidental loss of or damage to the Insured Vehicle.",
                "[HIGHLIGHT]Standard Excess: The Insured shall be responsible for the first amount of each and every claim for accidental damage set out under 'Standard Excess' in the Schedule. MSIG's liability applies to the excess.",
                "If the assessed repair cost does not exceed the standard excess, no claim proceeds are payable.",
                "Repairs must be reported at an approved reporting centre within 24 hours of occurrence."
            ]
        },
        {
            "header": "MSIG MotorMax — Authorised Workshop Scheme (Page 3)",
            "sub": "Schedule of Endorsements · Endorsement M101",
            "section": "ENDORSEMENT M101 — AUTHORISED WORKSHOP CONDITION",
            "body": [
                "Applies to all policyholders insured under the MotorMax Authorised Workshop plan.",
                "[HIGHLIGHT]Endorsement M101: Repairs must be performed by an MSIG Authorised Workshop. Failure to comply will impose an additional excess of S$1,000 per own-damage claim, added to the standard excess.",
                "MSIG Authorised Workshops provide genuine replacement parts with a 12-month quality guarantee.",
                "MSIG reserves the right to decline or re-estimate non-panel workshop invoices."
            ]
        },
        {
            "header": "MSIG MotorMax — Young & Inexperienced Drivers (Page 4)",
            "sub": "General Exceptions · Clause 3(b) Excess",
            "section": "CLAUSE 3(b) — YOUNG AND INEXPERIENCED DRIVER EXCESS",
            "body": [
                "Applies cumulatively with the Basic Excess and Workshop Endorsement excess.",
                "[HIGHLIGHT]Clause 3(b): An additional excess of S$2,500 applies if the vehicle is driven by any person aged under 25 years or holding a driving licence for less than 2 years at the accident time.",
                "Applies to named drivers as well as any authorized unnamed driver operating the vehicle.",
                "If the driver meets both criteria (under 25 and under 2 years experience), only one S$2,500 excess applies."
            ]
        },
        {
            "header": "MSIG MotorMax — Windscreen Cover (Page 5)",
            "sub": "Endorsement W1 · Windscreen & Window Glass",
            "section": "ENDORSEMENT W1 — WINDSCREEN REPLACEMENT COVER",
            "body": [
                "Section 1 is extended to cover accidental breakage of windscreen and window glass.",
                "[HIGHLIGHT]Endorsement W1: Subject to an excess of S$100 per replacement. Reinstatement or replacement under this endorsement shall NOT affect your accrued No Claim Discount (NCD).",
                "Excess is waived (S$0) if glass repair is performed instead of complete replacement.",
                "Glass cover is reinstated automatically after settlement."
            ]
        },
        {
            "header": "MSIG MotorMax — NCD Protector (Page 6)",
            "sub": "Endorsement M50 · NCD Protection Rider",
            "section": "ENDORSEMENT M50 — NCD PROTECTOR BENEFIT",
            "body": [
                "Available to policyholders maintaining a 50% No Claim Discount at inception.",
                "[HIGHLIGHT]Endorsement M50: MSIG agrees that your 50% NCD will not be reduced by reason of one at-fault claim made during the policy period. Your renewal discount remains at 50%.",
                "A second at-fault claim within the same period will trigger the standard GIA 30% reduction.",
                "NCD Protector remains specific to the MSIG policy unless transferred under GIA guidelines."
            ]
        },
        {
            "header": "MSIG MotorMax — Third-Party Liability (Page 7)",
            "sub": "Section 2 · Liability to Third Parties",
            "section": "SECTION 2 — LIABILITY TO THIRD PARTIES",
            "body": [
                "Indemnifies the Insured against legal liability for third-party injury or property damage up to S$5,000,000.",
                "[HIGHLIGHT]Adverse Claim Rule: Settlement of a third-party claim docks your NCD by 30% under GIA rules regardless of whether you self-pay your own vehicle repairs.",
                "Subrogated non-fault claims under Knock-for-Knock agreements do not trigger NCD forfeiture.",
                "Prompt accident reporting within 24 hours is mandatory under MAS Notice 122."
            ]
        }
    ]

    create_multipage_pdf("public/policies/msig_motormax_policy.pdf", "MSIG MotorMax Comprehensive Policy", "MSIG Insurance", msig_pages)

if __name__ == "__main__":
    main()
