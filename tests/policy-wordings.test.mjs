import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { POLICY_WORDINGS, WORDING_TOPICS, wordingPageUrl } from "../src/policy-wordings.mjs";

function pdfPageCount(publicPath) {
  const bytes = fs.readFileSync(`public${publicPath}`, "latin1");
  return (bytes.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

test("every bundled wording covers every topic with a cited excerpt or an explained gap", () => {
  for (const wording of POLICY_WORDINGS) {
    assert.ok(fs.existsSync(`public${wording.pdfFile}`), `${wording.pdfFile} is bundled`);
    const pages = pdfPageCount(wording.pdfFile);
    for (const topic of WORDING_TOPICS) {
      const entry = wording.entries[topic.id];
      assert.ok(entry, `${wording.id} has ${topic.id}`);
      if (entry.excerpt === null) {
        assert.equal(entry.page, null);
        assert.ok(entry.note?.length > 0, `${wording.id}.${topic.id} explains the missing wording`);
        continue;
      }
      assert.ok(Array.isArray(entry.excerpt) && entry.excerpt.length > 0);
      assert.ok(entry.excerpt.every((paragraph) => paragraph.trim().length > 0));
      assert.ok(Number.isInteger(entry.page) && entry.page >= 1 && entry.page <= pages,
        `${wording.id}.${topic.id} cites page ${entry.page} of ${pages}`);
      assert.ok(entry.section);
    }
  }
});

test("wording page links resolve to a physical PDF page anchor", () => {
  const [income] = POLICY_WORDINGS;
  assert.equal(wordingPageUrl(income, 7), "/policies/income_drivo_policy.pdf#page=7&view=FitH");
  assert.equal(wordingPageUrl(income, null), "/policies/income_drivo_policy.pdf");
});
