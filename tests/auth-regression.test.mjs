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
