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
