import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html = await readFile(new URL("../app.html", import.meta.url), "utf8");
const js = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("authentication card contract remains present", () => {
  for (const id of ["authPanel","signInTab","signUpTab","email","password","authSubmit","googleSignIn","signOut"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing auth element #${id}`);
  }
  assert.match(html, /SIA Compliance Manager/);
  assert.match(html, /favi\.png/);
});

test("Firebase auth providers and actions remain wired", () => {
  for (const token of ["onAuthStateChanged","createUserWithEmailAndPassword","signInWithEmailAndPassword","GoogleAuthProvider","signInWithPopup","signOut"]) {
    assert.match(js, new RegExp(token), `missing Firebase auth wiring: ${token}`);
  }
});

test("sign-out returns UI to protected signed-out state", () => {
  assert.match(js, /authPanel[^\n]*remove\("hidden"\)/);
  assert.match(js, /companyPanel[^\n]*add\("hidden"\)/);
  assert.match(js, /workspace[^\n]*add\("hidden"\)/);
  assert.match(js, /companyId=null/);
});

test("authenticated session still loads company before workspace data", () => {
  assert.match(js, /onAuthStateChanged\(auth,u=>/);
  assert.match(js, /loadCompany\(u\)/);
  assert.match(js, /loadOfficers\(\)/);
});

test("company bootstrap and officer persistence contract remains wired", () => {
  for (const token of ['"users",u.uid','"companies",ref.id,"members",u.uid','"companies",companyId,"officers"',"serverTimestamp"]) {
    assert.ok(js.includes(token), `missing persistence contract: ${token}`);
  }
});

test("SIA licence register is additive and preserves officer workspace contract", () => {
  for (const id of ["licenceOfficer","licenceNumber","licenceType","licenceExpiryDate","saveLicence","licences"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing licence register element #${id}`);
  }
  assert.ok(js.includes('"siaLicences"'), "missing SIA licence Firestore collection");
  assert.ok(js.includes("licenceStatus"), "missing licence expiry status calculation");
});

test("SIA licence save failures are visible instead of appearing unresponsive", () => {
  assert.ok(js.includes("SIA licence save failed"));
  assert.ok(js.includes("Licence could not be saved"));
});


test("manual SIA verification copies the licence number and records the audit marker", () => {
  assert.match(html, /<th>Verify<\/th><th>Verified<\/th>/);
  assert.ok(js.includes("https://rolh.services.sia.homeoffice.gov.uk/"), "missing official SIA register destination");
  assert.ok(js.includes("navigator.clipboard.writeText"), "licence number is not copied for verification");
  assert.ok(js.includes('title="Copies licence number and opens SIA Register"'), "missing Verify hover hint");
  assert.ok(js.includes("Licence number copied"), "missing copied-number confirmation hint");
  for (const token of ["verifiedAt","verifiedDate","verifiedBy","SIA verification update failed"]) {
    assert.ok(js.includes(token), `missing verification contract: ${token}`);
  }
});


test("SIA expiry monitoring uses the approved warning bands", () => {
  for (const token of ["90 DAYS","60 DAYS","30 DAYS","14 DAYS","7 DAYS","EXPIRED"]) assert.ok(js.includes(token), `missing expiry band: ${token}`);
  assert.match(html, /Licence Expiry Monitoring/);
  assert.ok(js.includes("renderExpiryAlerts(rows)"), "expiry alert summary is not rendered from licence data");
});


test("workspace prioritises compliance monitoring over administration", () => {
  const company = html.indexOf('id="companyTitle"');
  const expiry = html.indexOf("Licence Expiry Monitoring");
  const officers = html.indexOf("<h2>Officers</h2>");
  const register = html.indexOf("<h2>SIA Licence Register</h2>");
  const addOfficer = html.indexOf("<h2>Add officer</h2>");
  assert.ok(company < expiry && expiry < register && register < officers && officers < addOfficer, "workspace panel order regressed");
  assert.ok(!html.includes("Phase 1 workforce foundation"), "development-only Phase 1 label is visible");
});


test("SIA licence rows support renewal updates", () => {
  assert.match(html, /<th>Update<\/th>/);
  for (const token of ["data-update-licence","licenceCache","Update licence","licenceExpiryDate"]) assert.ok(js.includes(token), `missing licence update contract: ${token}`);
});


test("officer list follows licence register and provides contact actions", () => {
  const register = html.indexOf("<h2>SIA Licence Register</h2>");
  const officers = html.indexOf("<h2>Officers</h2>");
  const addOfficer = html.indexOf("<h2>Add officer</h2>");
  assert.ok(register < officers && officers < addOfficer, "officer panel order regressed");
  assert.match(html, /<th>Contact<\/th>/);
  assert.ok(js.includes('href="tel:'), "missing Call action");
  assert.ok(js.includes("https://wa.me/"), "missing WhatsApp action");
});


test("SIA licence workflow uses expiry and verification dates only", () => {
  assert.ok(!html.includes("licenceIssueDate"), "issue date input returned");
  assert.ok(!html.includes("<th>Issue</th>"), "issue date column returned");
  assert.ok(!js.includes("issueDate"), "issue date remains in active licence workflow");
  assert.ok(js.includes("expiryDate"), "expiry date must remain for monitoring");
  assert.ok(js.includes("verifiedDate"), "verification date must remain for audit evidence");
});
