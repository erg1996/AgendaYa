#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:5030"

TEST_DATE=$(node -e "
const d = new Date();
const wd = d.getDay();
const diff = ((3 - wd) + 7) % 7 || 7;
d.setDate(d.getDate() + diff);
const y = d.getFullYear();
const m = String(d.getMonth()+1).padStart(2,'0');
const day = String(d.getDate()).padStart(2,'0');
console.log(y+'-'+m+'-'+day);
")

echo "=== Multi-Employee & Multi-Tenant Integration Test ==="
echo "API: $BASE  |  Test date (next Wednesday): $TEST_DATE"
echo ""

PASS=0; FAIL=0

ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
fail(){ echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

assert_eq() {
  [ "$2" = "$3" ] && ok "$1" || fail "$1 — got='$2' want='$3'"
}
assert_contains() {
  echo "$2" | grep -q "$3" && ok "$1" || { fail "$1 — '$3' not found"; echo "         response: $2"; }
}
assert_not_contains() {
  echo "$2" | grep -q "$3" && fail "$1 — '$3' found (should NOT be present)" || ok "$1"
}
assert_http() {
  [ "$2" = "$3" ] && ok "$1 (HTTP $2)" || fail "$1 — got HTTP $2 want $3"
}
assert_ge() {
  [ "$2" -ge "$3" ] 2>/dev/null && ok "$1 (got $2 >= $3)" || fail "$1 — got=$2 want>=$3"
}
assert_denied() {
  local label="$1" code="$2"
  if [ "$code" = "401" ] || [ "$code" = "403" ] || [ "$code" = "404" ]; then
    ok "$label (HTTP $code)"
  else
    fail "$label — got HTTP $code (expected 401/403/404)"
  fi
}

jq_str()   { echo "$1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);const v=eval('o'+\"$2\");console.log(v==null?'':v)}catch{console.log('')}})" 2>/dev/null || echo ""; }
jq_len()   { echo "$1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);console.log(eval('o'+\"$2\").length)}catch{console.log(0)}})" 2>/dev/null || echo "0"; }
jq_first() { echo "$1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);console.log(JSON.stringify(Array.isArray(o)?o[0]:{}))}catch{console.log('{}')}})" 2>/dev/null || echo "{}"; }

SUFFIX=$RANDOM
COOKIE_JAR=$(mktemp)

# ── CSRF token ────────────────────────────────────────────────────────────────
echo "── CSRF token ──"
curl -s -c "$COOKIE_JAR" "$BASE/health" > /dev/null
# Cookie jar stores URL-encoded values (e.g. %2B for +). ASP.NET Core decodes
# cookies when reading them, so the X-CSRF-Token header needs the decoded value.
CSRF_TOKEN_RAW=$(grep "XSRF-TOKEN" "$COOKIE_JAR" | awk '{print $7}' | tr -d '\r\n')
CSRF_TOKEN=$(node -e "console.log(decodeURIComponent('${CSRF_TOKEN_RAW}'))" 2>/dev/null || echo "$CSRF_TOKEN_RAW")
[ -n "$CSRF_TOKEN" ] && ok "Got XSRF-TOKEN" || fail "No XSRF-TOKEN in cookie jar"
# Array used as: curl ... "${CSRF[@]}"
# Pass the cookie jar for the Cookie header AND the decoded value in X-CSRF-Token.
CSRF=(-b "$COOKIE_JAR" -H "X-CSRF-Token: ${CSRF_TOKEN}")

echo ""
# ── Register (creates business automatically; register is CSRF-exempt) ─────────
echo "── Register users ──"

REG1=$(curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"biz1_${SUFFIX}@test.com\",\"password\":\"Pass123!\",\"fullName\":\"Owner One\",\"businessName\":\"Barberia Alpha ${SUFFIX}\",\"inviteCode\":\"test\"}")
TOKEN1=$(jq_str "$REG1" "['token']")
BIZ1_ID=$(jq_str "$REG1" "['businessId']")
{ [ -n "$TOKEN1" ] && [ "$TOKEN1" != "null" ] && [ "$TOKEN1" != "undefined" ]; } && ok "Register biz1 (businessId=$BIZ1_ID)" || fail "Register biz1: $REG1"

REG2=$(curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"biz2_${SUFFIX}@test.com\",\"password\":\"Pass123!\",\"fullName\":\"Owner Two\",\"businessName\":\"Spa Omega ${SUFFIX}\",\"inviteCode\":\"test\"}")
TOKEN2=$(jq_str "$REG2" "['token']")
BIZ2_ID=$(jq_str "$REG2" "['businessId']")
{ [ -n "$TOKEN2" ] && [ "$TOKEN2" != "null" ] && [ "$TOKEN2" != "undefined" ]; } && ok "Register biz2 (businessId=$BIZ2_ID)" || fail "Register biz2: $REG2"

echo ""
# ── Create services ───────────────────────────────────────────────────────────
echo "── Create services ──"

SVC1=$(curl -s -X POST "$BASE/api/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"name\":\"Corte Clasico\",\"durationMinutes\":30,\"price\":15.00}")
SVC1_ID=$(jq_str "$SVC1" "['id']")
assert_contains "Create biz1 service" "$SVC1" "Corte Clasico"

SVC2=$(curl -s -X POST "$BASE/api/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ2_ID\",\"name\":\"Masaje Relajante\",\"durationMinutes\":60,\"price\":35.00}")
SVC2_ID=$(jq_str "$SVC2" "['id']")
assert_contains "Create biz2 service" "$SVC2" "Masaje Relajante"

echo ""
# ── Create employees ──────────────────────────────────────────────────────────
echo "── Create employees ──"

EMP_C=$(curl -s -X POST "$BASE/api/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"name\":\"Carlos Mendez\",\"color\":\"#e11d48\",\"commissionPercent\":80}")
CARLOS_ID=$(jq_str "$EMP_C" "['id']")
assert_contains "Create Carlos (biz1)" "$EMP_C" "Carlos Mendez"

EMP_L=$(curl -s -X POST "$BASE/api/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"name\":\"Laura Rios\",\"color\":\"#7c3aed\",\"commissionPercent\":70}")
LAURA_ID=$(jq_str "$EMP_L" "['id']")
assert_contains "Create Laura (biz1)" "$EMP_L" "Laura Rios"

EMP_S=$(curl -s -X POST "$BASE/api/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ2_ID\",\"name\":\"Sofia Vega\",\"color\":\"#0891b2\",\"commissionPercent\":75}")
SOFIA_ID=$(jq_str "$EMP_S" "['id']")
assert_contains "Create Sofia (biz2)" "$EMP_S" "Sofia Vega"

echo "  carlos=$CARLOS_ID  laura=$LAURA_ID  sofia=$SOFIA_ID"

echo ""
# ── Assign services with overrides ───────────────────────────────────────────
echo "── Assign services to employees ──"

R_C=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/api/employees/$CARLOS_ID?businessId=$BIZ1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"name\":\"Carlos Mendez\",\"color\":\"#e11d48\",\"isActive\":true,\"displayOrder\":0,\"commissionPercent\":80,\"services\":[{\"serviceId\":\"$SVC1_ID\",\"overridePrice\":null,\"overrideDurationMinutes\":null}]}")
assert_http "Assign service to Carlos (30min, no override)" "$(echo "$R_C" | tail -1)" "200"

R_L=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/api/employees/$LAURA_ID?businessId=$BIZ1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"name\":\"Laura Rios\",\"color\":\"#7c3aed\",\"isActive\":true,\"displayOrder\":1,\"commissionPercent\":70,\"services\":[{\"serviceId\":\"$SVC1_ID\",\"overridePrice\":9.50,\"overrideDurationMinutes\":25}]}")
assert_http "Assign service to Laura (25min override, \$9.50)" "$(echo "$R_L" | tail -1)" "200"

R_S=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/api/employees/$SOFIA_ID?businessId=$BIZ2_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  "${CSRF[@]}" \
  -d "{\"name\":\"Sofia Vega\",\"color\":\"#0891b2\",\"isActive\":true,\"displayOrder\":0,\"commissionPercent\":75,\"services\":[{\"serviceId\":\"$SVC2_ID\",\"overridePrice\":null,\"overrideDurationMinutes\":null}]}")
assert_http "Assign service to Sofia (biz2)" "$(echo "$R_S" | tail -1)" "200"

echo ""
# ── Working hours ─────────────────────────────────────────────────────────────
echo "── Set working hours (Wednesday = dayOfWeek 3) ──"

WH_C=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/employees/$CARLOS_ID/working-hours?businessId=$BIZ1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"employeeId\":\"$CARLOS_ID\",\"dayOfWeek\":3,\"startTime\":\"09:00:00\",\"endTime\":\"13:00:00\"}")
assert_http "Carlos WH: Wed 09-13" "$(echo "$WH_C" | tail -1)" "201"

WH_L=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/employees/$LAURA_ID/working-hours?businessId=$BIZ1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  "${CSRF[@]}" \
  -d "{\"employeeId\":\"$LAURA_ID\",\"dayOfWeek\":3,\"startTime\":\"13:00:00\",\"endTime\":\"18:00:00\"}")
assert_http "Laura WH: Wed 13-18" "$(echo "$WH_L" | tail -1)" "201"

WH_S=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/employees/$SOFIA_ID/working-hours?businessId=$BIZ2_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  "${CSRF[@]}" \
  -d "{\"employeeId\":\"$SOFIA_ID\",\"dayOfWeek\":3,\"startTime\":\"10:00:00\",\"endTime\":\"18:00:00\"}")
assert_http "Sofia WH: Wed 10-18 (biz2)" "$(echo "$WH_S" | tail -1)" "201"

echo ""
# ── Availability ──────────────────────────────────────────────────────────────
echo "── Availability: aggregate biz1 ──"
AVAIL_ALL=$(curl -s "$BASE/api/availability?businessId=$BIZ1_ID&date=$TEST_DATE&serviceId=$SVC1_ID")
SLOT_ALL=$(jq_len "$AVAIL_ALL" "")
assert_ge "Aggregate slot count >= 8" "$SLOT_ALL" 8
FIRST_SLOT=$(jq_first "$AVAIL_ALL")
assert_contains "First slot has availableEmployees" "$FIRST_SLOT" "availableEmployees"

echo ""
echo "── Availability: Carlos-only (09-13 @ 30min → 8 slots) ──"
AVAIL_C=$(curl -s "$BASE/api/availability?businessId=$BIZ1_ID&date=$TEST_DATE&serviceId=$SVC1_ID&employeeId=$CARLOS_ID")
assert_eq "Carlos slot count = 8" "$(jq_len "$AVAIL_C" "")" "8"

echo ""
echo "── Availability: Laura-only (13-18 @ 25min → 12 slots) ──"
AVAIL_L=$(curl -s "$BASE/api/availability?businessId=$BIZ1_ID&date=$TEST_DATE&serviceId=$SVC1_ID&employeeId=$LAURA_ID")
assert_eq "Laura slot count = 12" "$(jq_len "$AVAIL_L" "")" "12"

echo ""
# ── Book appointments ─────────────────────────────────────────────────────────
echo "── Book: Carlos @ 09:00 ──"
BOOK_C=$(curl -s -X POST "$BASE/api/appointments" \
  -H "Content-Type: application/json" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"serviceId\":\"$SVC1_ID\",\"employeeId\":\"$CARLOS_ID\",\"customerName\":\"Cliente Uno\",\"customerEmail\":\"c1@test.com\",\"customerPhone\":\"+50312345678\",\"appointmentDate\":\"${TEST_DATE}T09:00:00\"}")
CARLOS_APPT_ID=$(jq_str "$BOOK_C" "['id']")
assert_contains "Book Carlos appointment" "$BOOK_C" "\"id\""
assert_eq "Carlos appt.employeeId" "$(jq_str "$BOOK_C" "['employeeId']")" "$CARLOS_ID"

echo ""
echo "── Book: Laura @ 13:00 ──"
BOOK_L=$(curl -s -X POST "$BASE/api/appointments" \
  -H "Content-Type: application/json" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"serviceId\":\"$SVC1_ID\",\"employeeId\":\"$LAURA_ID\",\"customerName\":\"Cliente Dos\",\"customerEmail\":\"c2@test.com\",\"customerPhone\":\"+50387654321\",\"appointmentDate\":\"${TEST_DATE}T13:00:00\"}")
LAURA_APPT_ID=$(jq_str "$BOOK_L" "['id']")
assert_contains "Book Laura appointment" "$BOOK_L" "\"id\""
assert_eq "Laura appt.employeeId"    "$(jq_str "$BOOK_L" "['employeeId']")"   "$LAURA_ID"
assert_eq "Laura appt.employeeName"  "$(jq_str "$BOOK_L" "['employeeName']")" "Laura Rios"
assert_eq "Laura appt.employeeColor" "$(jq_str "$BOOK_L" "['employeeColor']")" "#7c3aed"

echo ""
echo "── Overlap: same employee same time → must be rejected ──"
OVERLAP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/appointments" \
  -H "Content-Type: application/json" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"serviceId\":\"$SVC1_ID\",\"employeeId\":\"$CARLOS_ID\",\"customerName\":\"Doble\",\"appointmentDate\":\"${TEST_DATE}T09:00:00\"}")
if [ "$OVERLAP" = "409" ] || [ "$OVERLAP" = "400" ]; then
  ok "Overlap same employee rejected (HTTP $OVERLAP)"
else
  fail "Overlap — expected 409/400, got $OVERLAP"
fi

echo ""
echo "── Parallel: different employees same slot → must succeed ──"
# Laura @ 13:25 (after her 13:00+25min appt ends, and Carlos is in his 09-13 block)
PARALLEL=$(curl -s -X POST "$BASE/api/appointments" \
  -H "Content-Type: application/json" \
  "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"serviceId\":\"$SVC1_ID\",\"employeeId\":\"$LAURA_ID\",\"customerName\":\"Cliente Tres\",\"customerEmail\":\"c3@test.com\",\"appointmentDate\":\"${TEST_DATE}T13:25:00\"}")
assert_contains "Parallel booking Laura @ 13:25 succeeds" "$PARALLEL" "\"id\""

echo ""
# ── Multi-tenant isolation ─────────────────────────────────────────────────────
echo "── Multi-tenant: cross-business writes/reads must be denied ──"

# biz1 token → list biz2 employees
MT1=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/employees?businessId=$BIZ2_ID" \
  -H "Authorization: Bearer $TOKEN1")
assert_denied "biz1 token cannot list biz2 employees" "$MT1"

# biz2 token → create employee in biz1
MT2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/employees" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN2" "${CSRF[@]}" \
  -d "{\"businessId\":\"$BIZ1_ID\",\"name\":\"Spy\",\"color\":\"#000\"}")
assert_denied "biz2 token cannot create employee in biz1" "$MT2"

# biz2 token → add WH to Carlos (biz1 employee)
MT3=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/employees/$CARLOS_ID/working-hours?businessId=$BIZ1_ID" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN2" "${CSRF[@]}" \
  -d "{\"employeeId\":\"$CARLOS_ID\",\"dayOfWeek\":1,\"startTime\":\"09:00:00\",\"endTime\":\"18:00:00\"}")
assert_denied "biz2 token cannot set WH on biz1 employee" "$MT3"

# biz2 token → cancel biz1 appointment
if [ -n "$CARLOS_APPT_ID" ] && [ "$CARLOS_APPT_ID" != "null" ] && [ "$CARLOS_APPT_ID" != "undefined" ]; then
  MT4=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE/api/appointments/$CARLOS_APPT_ID/status" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN2" "${CSRF[@]}" \
    -d "{\"businessId\":\"$BIZ1_ID\",\"status\":\"Cancelled\"}")
  assert_denied "biz2 token cannot cancel biz1 appointment" "$MT4"
fi

# biz1 token → update biz2 employee
MT5=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PUT "$BASE/api/employees/$SOFIA_ID?businessId=$BIZ2_ID" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN1" "${CSRF[@]}" \
  -d "{\"name\":\"Spy Sofia\",\"color\":\"#000\",\"isActive\":true,\"displayOrder\":0,\"commissionPercent\":0,\"services\":[]}")
assert_denied "biz1 token cannot update biz2 employee" "$MT5"

# biz2 token → list biz1 appointments
MT6=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/appointments?businessId=$BIZ1_ID" \
  -H "Authorization: Bearer $TOKEN2")
assert_denied "biz2 token cannot list biz1 appointments" "$MT6"

echo ""
# ── Employee list isolation ───────────────────────────────────────────────────
echo "── Employee list isolation ──"

BIZ1_EMPS=$(curl -s "$BASE/api/employees?businessId=$BIZ1_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains     "biz1 list has Carlos Mendez"    "$BIZ1_EMPS" "Carlos Mendez"
assert_contains     "biz1 list has Laura Rios"       "$BIZ1_EMPS" "Laura Rios"
assert_not_contains "biz1 list has NO Sofia Vega"    "$BIZ1_EMPS" "Sofia Vega"

BIZ2_EMPS=$(curl -s "$BASE/api/employees?businessId=$BIZ2_ID" -H "Authorization: Bearer $TOKEN2")
assert_contains     "biz2 list has Sofia Vega"       "$BIZ2_EMPS" "Sofia Vega"
assert_not_contains "biz2 list has NO Carlos Mendez" "$BIZ2_EMPS" "Carlos Mendez"
assert_not_contains "biz2 list has NO Laura Rios"    "$BIZ2_EMPS" "Laura Rios"

echo ""
# ── Appointment list isolation ────────────────────────────────────────────────
echo "── Appointment list isolation ──"

APPTS1=$(curl -s "$BASE/api/appointments?businessId=$BIZ1_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains     "biz1 appts has Cliente Uno"   "$APPTS1" "Cliente Uno"
assert_contains     "biz1 appts has Cliente Dos"   "$APPTS1" "Cliente Dos"
assert_not_contains "biz1 appts has no biz2 data"  "$APPTS1" "Sofia Vega"

echo ""
# ── Availability isolation ────────────────────────────────────────────────────
echo "── Availability isolation: biz1 + biz2 service → 0 slots ──"
AVAIL_CROSS=$(curl -s "$BASE/api/availability?businessId=$BIZ1_ID&date=$TEST_DATE&serviceId=$SVC2_ID")
CROSS_LEN=$(jq_len "$AVAIL_CROSS" "")
if [ "$CROSS_LEN" = "0" ] || echo "$AVAIL_CROSS" | grep -qi "error\|not found\|invalid"; then
  ok "biz1 + biz2 service → 0 available slots"
else
  fail "Expected 0 slots for cross-tenant service, got $CROSS_LEN"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo ""
echo "══════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && echo "  ALL PASSED: $PASS/$TOTAL" || echo "  Results: $PASS/$TOTAL passed, $FAIL FAILED"
echo "══════════════════════════════════════════"
rm -f "$COOKIE_JAR"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
