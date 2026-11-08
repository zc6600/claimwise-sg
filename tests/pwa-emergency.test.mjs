import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import manifest from "../app/manifest.js";
import {
  STATUTORY_SERVICES,
  INSURER_HOTLINES,
  RTA_SECTION_84_RULES,
  ON_SCENE_CHECKLIST_ITEMS,
} from "../lib/emergency-data.js";

test("manifest generates valid Progressive Web App configuration", () => {
  const pwaManifest = manifest();

  assert.equal(typeof pwaManifest, "object");
  assert.equal(pwaManifest.short_name, "ClaimWise SG");
  assert.equal(pwaManifest.display, "standalone");
  assert.equal(pwaManifest.start_url, "/");
  assert.equal(pwaManifest.theme_color, "#0b1320");
  assert.equal(pwaManifest.background_color, "#0b1320");

  assert.ok(Array.isArray(pwaManifest.icons));
  assert.ok(pwaManifest.icons.length > 0);
  assert.equal(pwaManifest.icons[0].src, "/icon.svg");
  assert.equal(pwaManifest.icons[0].type, "image/svg+xml");
});

test("emergency statutory services directory contains verified Singapore numbers", () => {
  assert.ok(STATUTORY_SERVICES.length >= 4);

  const police = STATUTORY_SERVICES.find((s) => s.id === "police_emergency");
  assert.ok(police);
  assert.equal(police.phone, "999");
  assert.equal(police.isEmergencyOnly, true);

  const scdf = STATUTORY_SERVICES.find((s) => s.id === "scdf_ambulance");
  assert.ok(scdf);
  assert.equal(scdf.phone, "995");
  assert.equal(scdf.isEmergencyOnly, true);

  const emas = STATUTORY_SERVICES.find((s) => s.id === "lta_emas");
  assert.ok(emas);
  assert.equal(emas.phone, "18002255582");
  assert.match(emas.scope, /expressway/i);
});

test("insurer hotlines directory contains operating hours and eligibility disclosures", () => {
  assert.ok(INSURER_HOTLINES.length >= 3);

  const insurerIds = INSURER_HOTLINES.map((ins) => ins.id);
  assert.ok(insurerIds.includes("income"));
  assert.ok(insurerIds.includes("etiqa"));
  assert.ok(insurerIds.includes("msig"));

  for (const insurer of INSURER_HOTLINES) {
    assert.ok(insurer.name.length > 0);
    assert.ok(insurer.phone.length > 0);
    assert.ok(insurer.displayPhone.length > 0);
    assert.ok(insurer.service.length > 0);
    assert.ok(insurer.hours.length > 0);
    assert.ok(insurer.eligibility.length > 0);
  }
});

test("RTA Section 84 statutory rules enforce police reporting for injuries and government property", () => {
  assert.ok(RTA_SECTION_84_RULES.length >= 5);

  const injuryRule = RTA_SECTION_84_RULES.find((r) => r.id === "injury");
  assert.ok(injuryRule);
  assert.equal(injuryRule.mandatoryPoliceReport, true);
  assert.match(injuryRule.description, /hospitalisation|medical leave/i);

  const govPropRule = RTA_SECTION_84_RULES.find((r) => r.id === "gov_property");
  assert.ok(govPropRule);
  assert.equal(govPropRule.mandatoryPoliceReport, true);

  const foreignVehRule = RTA_SECTION_84_RULES.find((r) => r.id === "foreign_vehicle");
  assert.ok(foreignVehRule);
  assert.equal(foreignVehRule.mandatoryPoliceReport, true);
});

test("on-scene evidence checklist includes tow truck caution and dashcam preservation", () => {
  assert.equal(ON_SCENE_CHECKLIST_ITEMS.length, 6);

  const itemIds = ON_SCENE_CHECKLIST_ITEMS.map((item) => item.id);
  assert.ok(itemIds.includes("safety_first"));
  assert.ok(itemIds.includes("scene_overview"));
  assert.ok(itemIds.includes("damage_and_plates"));
  assert.ok(itemIds.includes("dashcam_secured"));
  assert.ok(itemIds.includes("particulars_exchanged"));
  assert.ok(itemIds.includes("tow_truck_refusal"));
});

test("public/sw.js defines versioned precaching, scoped cleanup, and event lifetime extensions", () => {
  const swContent = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  // Verified precache prefix and scoped cleanup
  assert.match(swContent, /const CACHE_PREFIX = "claimwise-offline-"/);
  assert.match(swContent, /name\.startsWith\(CACHE_PREFIX\)/);

  // Precached URLs include core offline routes
  assert.match(swContent, /"\/emergency"/);
  assert.match(swContent, /"\/calculator"/);
  assert.match(swContent, /"\/settlement"/);
  assert.match(swContent, /"\/manifest\.webmanifest"/);

  // Background cache writes are tied to event.waitUntil
  assert.match(swContent, /event\.waitUntil\(/);
});
