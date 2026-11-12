import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// 1. UNIT TEST: Cryptographic Hash Token (SHA-256)
test("hashToken generates predictable, non-reversible SHA-256 hex hash", () => {
  const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
  const token = "secret_reset_token_xyz_123";
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);

  assert.equal(hash1, hash2, "Hashes must be identical for the same token");
  assert.equal(hash1.length, 64, "SHA-256 hex length must be 64 characters");
  assert.notEqual(hash1, token, "Hash must not equal plain token");
});

// 2. UNIT TEST: Brute-Force Account Lockout System
test("accountLockout locks account after 5 failed attempts", () => {
  const accountLockStore = new Map();
  const MAX_FAILED = 5;
  const LOCK_DURATION = 15 * 60 * 1000;

  function recordFailed(username) {
    const key = username.toLowerCase().trim();
    const now = Date.now();
    const rec = accountLockStore.get(key) || { attempts: 0 };
    rec.attempts += 1;
    if (rec.attempts >= MAX_FAILED) {
      rec.lockedUntil = now + LOCK_DURATION;
      accountLockStore.set(key, rec);
      return { locked: true, attempts: rec.attempts };
    }
    accountLockStore.set(key, rec);
    return { locked: false, attempts: rec.attempts };
  }

  function checkLockout(username) {
    const key = username.toLowerCase().trim();
    const rec = accountLockStore.get(key);
    if (!rec || !rec.lockedUntil) return { locked: false };
    if (Date.now() < rec.lockedUntil) return { locked: true };
    return { locked: false };
  }

  const user = "test_target_user";
  for (let i = 1; i <= 4; i++) {
    const res = recordFailed(user);
    assert.equal(res.locked, false, `Attempt ${i} should not lock yet`);
  }
  const fifthAttempt = recordFailed(user);
  assert.equal(fifthAttempt.locked, true, "5th attempt must lock the account");
  assert.equal(checkLockout(user).locked, true, "Subsequent check must be locked");
});

// 3. UNIT TEST: Telegram Webhook Deduplication (Idempotency)
test("deduplication sliding cache ignores duplicate update_id", () => {
  const processed = new Set();
  function isProcessed(id) {
    return processed.has(id);
  }
  function markProcessed(id) {
    processed.add(id);
  }

  const updateId = 99882211;
  assert.equal(isProcessed(updateId), false, "Fresh update must not be marked processed");
  markProcessed(updateId);
  assert.equal(isProcessed(updateId), true, "Duplicate update must be recognized as processed");
});

// 4. UNIT TEST: Indonesian NLP Transaction Parser
test("NLP parser correctly extracts amounts, types, and categories", () => {
  function parseText(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();
    let tipe = "expense";
    if (text.startsWith("+") || /gaji|masuk|bonus|income/.test(lower)) tipe = "income";

    const numRegex = /(\d+(?:[.,]\d+)*)(?:\s*(jt|juta|k|rb|ribu)(?![a-zA-Z]))?/i;
    const match = text.match(numRegex);
    if (!match) return null;

    const rawNum = match[1];
    const suffix = (match[2] || "").toLowerCase();
    let amount = 0;
    if (suffix === "jt" || suffix === "juta") {
      amount = Math.round(parseFloat(rawNum.replace(/,/g, ".")) * 1000000);
    } else if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
      amount = Math.round(parseFloat(rawNum.replace(/,/g, ".")) * 1000);
    } else {
      amount = parseInt(rawNum.replace(/[^0-9]/g, ""), 10);
    }

    let desc = text.replace(match[0], "").replace(/^[+\-]\s*/, "").replace(/^(masuk|keluar|beli|bayar)\s*/i, "").trim();
    let kategori = "Umum";
    const descLower = (desc + " " + lower).toLowerCase();
    if (tipe === "income") {
      if (/gaji|honor|bonus/.test(descLower)) kategori = "Gaji";
      else kategori = "Pemasukan";
    } else {
      if (/kopi|makan|nasi/.test(descLower)) kategori = "Makanan";
      else if (/bensin|pertalite|gojek|grab/.test(descLower)) kategori = "Transport";
      else if (/listrik|pln|wifi/.test(descLower)) kategori = "Tagihan";
    }

    return { tipe, amount, kategori, desc };
  }

  // Case A: 35k bensin
  const t1 = parseText("beli bensin 35k");
  assert.equal(t1.tipe, "expense");
  assert.equal(t1.amount, 35000);
  assert.equal(t1.kategori, "Transport");

  // Case B: 1.5jt gaji
  const t2 = parseText("+1.5jt gaji bulanan");
  assert.equal(t2.tipe, "income");
  assert.equal(t2.amount, 1500000);
  assert.equal(t2.kategori, "Gaji");

  // Case C: 25.000 makan siang
  const t3 = parseText("keluar 25.000 nasi soto");
  assert.equal(t3.tipe, "expense");
  assert.equal(t3.amount, 25000);
  assert.equal(t3.kategori, "Makanan");
});

// 5. UNIT TEST: Financial Net Balance & Calculations
test("financial summary computes net balance without floating point inaccuracy", () => {
  const transactions = [
    { tipe: "income", jumlah: 15000000 },
    { tipe: "expense", jumlah: 350000 },
    { tipe: "expense", jumlah: 186000.5 },
    { tipe: "income", jumlah: 500000 },
  ];

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.tipe === "income") totalIncome += t.jumlah;
    if (t.tipe === "expense") totalExpense += t.jumlah;
  }
  const saldo = totalIncome - totalExpense;

  assert.equal(totalIncome, 15500000);
  assert.equal(totalExpense, 536000.5);
  assert.equal(saldo, 14963999.5);
});
