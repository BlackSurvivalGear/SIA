import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html = await readFile(new URL("../app.html", import.meta.url), "utf8");
const js = await readFile(new URL("../app.js", import.meta.url), "utf8");
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

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
  assert.ok(js.includes("data-call"), "missing Call button action");
  assert.ok(js.includes("data-whatsapp"), "missing WhatsApp button action");
  assert.ok(js.includes('window.location.href="tel:"+btn.dataset.call'), "Call button is not wired to the phone action");
  assert.ok(js.includes('window.open("https://wa.me/"+btn.dataset.whatsapp'), "WhatsApp button is not wired to WhatsApp");
});


test("SIA licence workflow uses expiry and verification dates only", () => {
  assert.ok(!html.includes("licenceIssueDate"), "issue date input returned");
  assert.ok(!html.includes("<th>Issue</th>"), "issue date column returned");
  assert.ok(!js.includes("issueDate"), "issue date remains in active licence workflow");
  assert.ok(js.includes("expiryDate"), "expiry date must remain for monitoring");
  assert.ok(js.includes("verifiedDate"), "verification date must remain for audit evidence");
});


test("expiry warning cards expand to matching officer details", () => {
  for (const token of ["data-alert-band","alertDetails","aria-expanded","Select a warning card"]) assert.ok(js.includes(token), `missing interactive expiry contract: ${token}`);
  for (const heading of ["Name","Email","Phone","SIA Licence","Contact"]) assert.ok(js.includes(`<th>${heading}</th>`), `missing expiry officer field: ${heading}`);
  assert.ok(js.includes("contactButtons(o)"), "expiry details do not reuse officer contact actions");
});


test("expiry officer rows render in one separate panel below all summary cards", () => {
  const summary = html.indexOf('id="alertSummary"');
  const details = html.indexOf('id="alertDetails"');
  const alerts = html.indexOf('id="expiryAlerts"');
  assert.ok(summary < details && details < alerts, "expiry details panel is not below the summary cards");
  assert.ok(!js.includes("data-alert-details"), "officer rows are still embedded inside individual cards");
  assert.ok(js.includes('details.classList.add("hidden")'), "second click does not hide the officer panel");
  assert.ok(js.includes('if(open)return'), "selected card does not toggle closed");
});


test("active expiry bands use graduated warning colours and primary save actions are green", () => {
  for (const token of ["alert-expired","alert-7-days","alert-14-days","alert-30-days","alert-60-90-days","has-alert"]) assert.ok(html.includes(token)||js.includes(token), `missing warning colour contract: ${token}`);
  assert.match(html, /id="saveLicence" class="success-action"/);
  assert.match(html, /id="addOfficer" class="success-action"/);
  assert.ok(js.includes('count?"has-alert alert-"+tone:""'), "empty warning cards should remain neutral");
});


test("licence registration selector excludes officers already registered", () => {
  assert.ok(js.includes("registeredIds=new Set(rows.map(l=>l.officerId))"), "registered officer IDs are not derived from licence records");
  assert.ok(js.includes("officerCache.filter(o=>!registeredIds.has(o.id))"), "registered officers remain available for new licence registration");
  assert.ok(js.includes("Selected officer"), "renewal update cannot retain its existing registered officer");
});


test("active compliance warnings use bold urgency colours and GitHub-style green actions", () => {
  for (const colour of ["#8b0000","#c62828","#e64a19","#ef6c00","#f9a825"]) assert.ok(html.includes(colour), `missing bold warning colour: ${colour}`);
  assert.ok(html.includes("#1f883d"), "primary green does not match approved GitHub-style green");
  assert.ok(html.includes(".alert-card.has-alert .alert-card-toggle strong,.alert-card.has-alert .alert-card-toggle span{color:#fff}"), "warning card text is not protected for contrast");
});


test("officer contact actions include an Email mailto button", () => {
  assert.ok(js.includes('href="mailto:${encodeURIComponent(o.email)}"'), "Email action is not a native mailto control");
  assert.ok(js.includes("email-btn"), "Email mailto control is missing button styling");
  assert.ok(!js.includes("data-email"), "obsolete JavaScript email click handler remains");
});


test("expanded expiry officer rows show licence type", () => {
  assert.ok(js.includes("<th>Licence Type</th>"), "expiry details are missing Licence Type heading");
  assert.ok(js.includes('a.licence.licenceType||"—"'), "expiry details are missing the officer licence type");
});


test("officer list supports search and a five-row scrolling viewport", () => {
  assert.ok(html.includes('id="officerSearch"'), "officer search input missing");
  assert.ok(html.includes("officer-table-scroll"), "officer scrolling viewport missing");
  assert.ok(html.includes("max-height:305px"), "officer viewport is not constrained to approximately five rows");
  assert.ok(html.includes("position:sticky"), "officer table headings do not remain visible while scrolling");
  assert.ok(js.includes("function filterOfficers()"), "officer search filter missing");
  assert.ok(js.includes('search.addEventListener("input",filterOfficers)'), "officer search is not bound after workspace rendering");
  assert.ok(js.includes('row.style.display=match?"":"none"'), "officer rows are not immediately shown/hidden while typing");
  assert.ok(js.includes('search.dataset.liveSearch="true"'), "live search binding can be duplicated");
});


test("authentication controls are bound explicitly and only once", () => {
  assert.ok(js.includes("function bindAuthControls()"), "auth control binding function missing");
  assert.ok(js.includes('if($("authSubmit").dataset.bound)return'), "auth controls lack duplicate-binding guard");
  assert.ok(js.includes('$("authSubmit").onclick=()=>'), "email/password sign-in button is not bound");
  assert.ok(js.includes('$("googleSignIn").onclick=()=>signInWithPopup'), "Google sign-in button is not bound");
  assert.ok(js.includes("bindAuthControls();"), "auth controls are not initialised");
});


test("officers show licence Type after Phone and Add officer captures it", () => {
  assert.ok(html.includes("<th>Phone</th><th>Type</th><th>SIA Licence</th>"), "Type column is not positioned after Phone");
  assert.ok(html.includes('id="officerLicenceType"'), "Add officer licence type field missing");
  assert.ok(js.includes('id="officerType-${o.id}"'), "officer Type cell missing");
  assert.ok(js.includes('typeCell.textContent=l.licenceType||"—"'), "registered licence type does not update officer row");
  assert.ok(js.includes('licenceType:$("officerLicenceType").value'), "Add officer does not store selected licence type");
});


test("officer toolbar uses compact search with licence type filter", () => {
  assert.ok(html.includes('id="officerTypeFilter"'), "licence type filter missing beside search");
  assert.ok(html.includes("All licence types"), "licence type filter default missing");
  assert.ok(html.includes("width:min(100%,300px)"), "officer search has not been reduced");
  assert.ok(js.includes('typeFilter.addEventListener("change",filterOfficers)'), "licence type filter is not responsive");
  assert.ok(js.includes('data-officer-type'), "officer rows do not expose licence type for filtering");
});


test("company heading is centered and signed-in profile opens settings", () => {
  assert.ok(html.includes(".company-heading{text-align:center}"), "company heading is not centered");
  assert.ok(html.includes('id="profileButton"'), "signed-in profile button missing");
  assert.ok(html.includes('id="settingsPanel"'), "settings panel missing");
  assert.ok(js.includes('$("profileButton").onclick=()=>$("settingsPanel").classList.toggle("hidden")'), "profile button does not open settings");
  assert.ok(js.includes('u.photoURL||"favi.png"'), "profile image does not use the signed-in user photo with fallback");
});


test("company settings are editable and persist to the current tenant", () => {
  for (const id of ["settingsCompanyName","settingsCompanyEmail","settingsWebsite","settingsPrimaryContact","settingsRegisteredAddress","saveCompanySettings"]) assert.ok(html.includes(`id="${id}"`), `missing company setting: ${id}`);
  assert.ok(js.includes("function populateCompanySettings"), "saved company details are not loaded into Settings");
  assert.ok(js.includes('setDoc(doc(db,"companies",companyId),data,{merge:true})'), "company settings do not update the current company record");
  assert.ok(js.includes('$("companyTitle").textContent=name'), "company heading does not refresh after settings save");
  assert.ok(js.includes("Company details saved."), "successful settings save has no confirmation");
});


test("company settings removes excluded fields and separates user management", () => {
  for (const id of ["settingsTradingName","settingsCompanyNumber","settingsPhone","settingsOperationalAddress"]) assert.ok(!html.includes(`id="${id}"`), `excluded setting remains: ${id}`);
  assert.ok(html.includes('id="addCompanyUser"'), "Add user button missing");
  assert.ok(html.includes('id="newUserEmail"'), "new user email field missing");
  assert.ok(html.includes('id="newUserRole"'), "new user role selector missing");
  assert.ok(js.includes('async function loadCompanyUsers()'), "existing company users are not loaded");
  assert.ok(js.includes('data-remove-user'), "user removal control missing");
  assert.ok(js.includes('deleteDoc(doc(db,"companies",companyId,"members"'), "Remove does not delete company membership");
  assert.ok(js.includes('self?"Current user"'), "current user is not protected from self-removal");
});


test("company user invitations join the existing tenant securely", () => {
  assert.ok(js.includes("async function claimCompanyInvite(u)"), "invited-user claim flow missing");
  assert.ok(js.includes('doc(db,"invitations",email)'), "email invitation record missing");
  assert.ok(js.includes('invite.companyId,"members",u.uid'), "invite does not create membership in existing company");
  assert.ok(js.includes('{companyId:invite.companyId}'), "invite does not map user to existing company");
  assert.ok(js.includes("Access invitation created."), "admin receives no invitation confirmation");
  assert.ok(rules.includes("match /invitations/{email}"), "invitation security rules missing");
  assert.ok(rules.includes("request.resource.data.role in ['admin','viewer']"), "invitation roles are not restricted");
  assert.ok(rules.includes("exists(/databases/$(database)/documents/invitations/$(request.auth.token.email))"), "membership creation is not gated by invitation");
});


test("invited-user workspace can finish invitation claim and render", () => {
  assert.ok(js.includes("getDocs,deleteDoc,serverTimestamp"), "deleteDoc is not imported for invitation/member cleanup");
  assert.ok(js.includes('console.warn("Invitation consumed but cleanup is pending"'), "invitation cleanup can still abort workspace loading");
  assert.ok(js.includes('$("workspace").classList.remove("hidden")'), "authenticated company workspace reveal missing");
});


test("owner row never shows a Remove control", () => {
  assert.ok(js.includes('u.role==="owner"?"Owner"'), "owner is not protected from a visible Remove control");
});


test("company user limit is five including owner", () => {
  assert.ok(js.includes("const COMPANY_USER_LIMIT=5"), "five-user company limit missing");
  assert.ok(js.includes("members.size>=COMPANY_USER_LIMIT"), "Add user does not enforce company user limit");
  assert.ok(html.includes("Maximum 5 users including the Owner."), "user limit guidance missing");
});


test("officers can be deleted with confirmation", () => {
  assert.ok(js.includes("data-delete-officer"), "officer Delete action missing");
  assert.ok(js.includes("This cannot be undone."), "officer deletion confirmation missing");
  assert.ok(js.includes("btn.dataset.deleteOfficer"), "officer delete target missing");
  assert.ok(js.includes('siaLicences",btn.dataset.deleteOfficer'), "linked SIA licence is not deleted");
});


test("auth control binding cannot recursively call itself", () => {
  const start=js.indexOf("function bindAuthControls()");
  const end=js.indexOf("function ",start+9);
  const body=js.slice(start,end>start?end:start+500);
  assert.equal((body.match(/bindAuthControls\(\)/g)||[]).length,1,"bindAuthControls recursively calls itself");
});

test("company user limit constant is declared once", () => {
  assert.equal((js.match(/const COMPANY_USER_LIMIT=5/g)||[]).length,1,"company user limit constant is duplicated");
});
