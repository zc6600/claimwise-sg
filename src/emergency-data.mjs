/**
 * Singapore Motor Claims Framework (MCF) & Road Traffic Act Emergency Data Reference
 * Emergency checklists, police reporting rules, and insurer contacts for the emergency kit.
 */

export const STATUTORY_SERVICES = [
  {
    id: "police_emergency",
    name: "Police Emergency",
    phone: "999",
    displayPhone: "999",
    scope: "Life-threatening emergencies, severe collisions, or disputes",
    availability: "24/7",
    isEmergencyOnly: true,
  },
  {
    id: "scdf_ambulance",
    name: "SCDF Emergency Ambulance",
    phone: "995",
    displayPhone: "995",
    scope: "Injuries requiring emergency medical attention",
    availability: "24/7",
    isEmergencyOnly: true,
  },
  {
    id: "traffic_police",
    name: "Traffic Police Information Line",
    phone: "+6565470000",
    displayPhone: "6547 0000",
    scope: "General accident reporting queries (non-emergency)",
    availability: "Monday to Friday: 8:30 AM - 5:30 PM",
    isEmergencyOnly: false,
  },
  {
    id: "lta_emas",
    name: "LTA EMAS Breakdown Towing",
    phone: "18002255582",
    displayPhone: "1800-2255-582",
    scope: "Expressway breakdown & towing assistance only (PIE, AYE, CTE, ECP, KPE, etc.; not for basement/HDB carparks)",
    availability: "24/7 Expressway Patrol",
    isEmergencyOnly: false,
  },
];

export const INSURER_HOTLINES = [
  {
    id: "income",
    name: "Income Insurance (Drivo)",
    phone: "+6567886616",
    displayPhone: "6788 6616",
    service: "Orange Force Accident Response & Towing",
    hours: "Orange Force on-scene team: 8:00 AM - 8:00 PM (Mon-Sat, excl. PH); 24/7 emergency towing & claims hotline",
    eligibility: "Income private motor policyholders",
  },
  {
    id: "etiqa",
    name: "Tiq / Etiqa Insurance",
    phone: "18008864917",
    displayPhone: "1800 886 4917 / +65 6886 4917",
    service: "Emergency Motor Claims & Towing Assist",
    hours: "24/7 Emergency Towing & Claims helpline",
    eligibility: "Tiq and Etiqa comprehensive motor policyholders",
  },
  {
    id: "msig",
    name: "MSIG Insurance (MotorMax)",
    phone: "+6568277848",
    displayPhone: "6827 7848",
    service: "MSIG Motor Assist & Emergency Towing",
    hours: "24/7 Roadside Assistance for eligible comprehensive private motor policyholders; general claims inquiry lines operate during standard business hours",
    eligibility: "MSIG MotorMax comprehensive policyholders",
  },
];

export const RTA_SECTION_84_RULES = [
  {
    id: "injury",
    title: "Serious Injury or Fatality",
    description:
      "A Traffic Police report is mandatory if any party is injured requiring hospitalisation or at least 3 days of outpatient medical leave (MC), or conveyed by ambulance. Call 999 for emergencies. The accident cannot be settled privately.",
    mandatoryPoliceReport: true,
  },
  {
    id: "gov_property",
    title: "Government Property Damage",
    description:
      "Collisions with lamp posts, road dividers, ERP gantries, directional signs, or expressway railings require a mandatory Traffic Police report within 24 hours.",
    mandatoryPoliceReport: true,
  },
  {
    id: "foreign_vehicle",
    title: "Foreign-Registered Vehicle",
    description:
      "Accidents involving non-Singapore vehicles (e.g. Malaysian plates) must be lodged with the Traffic Police and insurer immediately.",
    mandatoryPoliceReport: true,
  },
  {
    id: "pedestrian_cyclist",
    title: "Pedestrian, Cyclist, or PMD Involved",
    description:
      "Collisions involving non-motorized road users require an immediate police report regardless of apparent severity.",
    mandatoryPoliceReport: true,
  },
  {
    id: "hit_and_run",
    title: "Hit-and-Run / Refusal to Identify",
    description:
      "If the other party flees the scene or refuses to provide identity/contact details, lodge a police report immediately.",
    mandatoryPoliceReport: true,
  },
];

export const ON_SCENE_CHECKLIST_ITEMS = [
  {
    id: "safety_first",
    label: "Ensure immediate safety and turn on hazard warning lights",
    subtext: "If in a multi-storey or basement carpark, move out of traffic flow if safe, or display a warning triangle.",
  },
  {
    id: "scene_overview",
    label: "Capture wide-angle photos of the accident scene",
    subtext: "Capture relative vehicle positions, carpark lot markings, lane arrows, and lighting conditions before moving vehicles.",
  },
  {
    id: "damage_and_plates",
    label: "Photograph close-up damage with vehicle license plates clearly visible",
    subtext: "Ensure registration numbers of both vehicles appear clearly in the damage pictures.",
  },
  {
    id: "dashcam_secured",
    label: "Preserve dashcam memory card immediately",
    subtext: "Power down or lock dashcam files to prevent continuous loop recording from overwriting crash footage.",
  },
  {
    id: "particulars_exchanged",
    label: "Exchange full driver particulars",
    subtext: "Record Driver Name, NRIC/FIN, Mobile Phone, Vehicle Registration, and Insurer Name.",
  },
  {
    id: "tow_truck_refusal",
    label: "Reject unauthorized tow-truck operators ('tow truck vultures')",
    subtext: "Never sign blank agreement slips. Call only your insurer's official hotline for towing assistance.",
  },
];
