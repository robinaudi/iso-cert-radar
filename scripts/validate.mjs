#!/usr/bin/env node
/**
 * 課程資料檢查器 — CI 在每個 Pull Request 上都會跑這支。
 *
 * 它的工作是在資料進到 main 之前，把「一眼看不出來但會讓網頁壞掉」的錯誤攔下來：
 * 日期打錯、必填欄位漏掉、分類標籤拼錯、id 撞號。
 *
 * 本地自己先跑一次：  node scripts/validate.mjs
 * 沒有任何外部套件，不需要 npm install。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = join(ROOT, "data", "courses.json");

// ---- 允許的值。要新增分類請一併改這裡和 index.html 的篩選按鈕 ----
const WHEN = ["weekday", "weekend", "tbd"];
const CERT = ["irca", "iso", "pro", "unknown", "none"];
const CATS = ["27001", "27701", "cloud", "42001", "pdpa", "short", "free"];
const REQUIRED = ["id", "start", "end", "when", "days", "code", "level", "cats", "title", "org", "place", "priceNote"];

const errors = [];
const warnings = [];

const fail = (where, msg, fix) => errors.push({ where, msg, fix });
const warn = (where, msg) => warnings.push({ where, msg });

// ---- 1. 檔案讀得到、而且是合法 JSON ----
let payload;
try {
  payload = JSON.parse(readFileSync(DATA_PATH, "utf8"));
} catch (err) {
  console.error(`\n✗ data/courses.json 不是合法的 JSON：\n  ${err.message}\n`);
  console.error("  最常見的原因：多了或少了一個逗號、用了中文的引號「」而不是英文的 \"。");
  console.error("  貼到 https://jsonlint.com 可以指出是第幾行。\n");
  process.exit(1);
}

if (!payload || typeof payload !== "object" || !Array.isArray(payload.courses)) {
  console.error('\n✗ data/courses.json 的最外層必須是 { "meta": {...}, "courses": [...] }\n');
  process.exit(1);
}

// ---- 2. 逐筆檢查 ----
const isDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const asDate = s => {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // 攔掉 2026-02-30 這種格式對但不存在的日期
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
};

const seenIds = new Map();

payload.courses.forEach((c, i) => {
  const where = c.id ? `courses[${i}] (id: ${c.id})` : `courses[${i}]`;

  for (const field of REQUIRED) {
    if (c[field] === undefined || c[field] === null || c[field] === "") {
      fail(where, `缺少必填欄位 "${field}"`, `補上 "${field}"。可以複製上一筆課程的格式來改。`);
    }
  }

  if (c.id !== undefined) {
    if (!/^[a-z0-9-]+$/.test(c.id)) {
      fail(where, `id "${c.id}" 只能用小寫英文、數字和連字號`, "例如 leadership-27001-0921");
    }
    if (seenIds.has(c.id)) {
      fail(where, `id "${c.id}" 和 courses[${seenIds.get(c.id)}] 重複`, "每筆課程的 id 必須唯一，通常是 主辦-標準-開課日。");
    } else {
      seenIds.set(c.id, i);
    }
  }

  // 日期
  for (const field of ["start", "end", "deadline"]) {
    const v = c[field];
    if (v === undefined) continue;
    if (!isDate(v)) {
      fail(where, `"${field}" 的格式必須是 YYYY-MM-DD，現在是 ${JSON.stringify(v)}`, '例如 "2026-09-21"。月和日不足兩位要補 0。');
    } else if (!asDate(v)) {
      fail(where, `"${field}" 是 ${v}，但這個日期不存在`, "檢查一下月份的天數。");
    }
  }

  if (isDate(c.start) && isDate(c.end) && asDate(c.start) && asDate(c.end)) {
    if (asDate(c.end) < asDate(c.start)) {
      fail(where, `"end" (${c.end}) 早於 "start" (${c.start})`, "結訓日不能早於開課日 — 通常是兩個欄位貼反了。");
    }
  }

  if (isDate(c.deadline) && isDate(c.start) && asDate(c.deadline) && asDate(c.start)) {
    if (asDate(c.deadline) > asDate(c.start)) {
      fail(where, `報名截止日 (${c.deadline}) 晚於開課日 (${c.start})`, "報名截止日應該在開課之前。");
    }
  }

  // 列舉值
  if (c.when !== undefined && !WHEN.includes(c.when)) {
    fail(where, `"when" 是 ${JSON.stringify(c.when)}，不在允許值內`, `只能填：${WHEN.join(" / ")}`);
  }
  if (c.cert !== undefined && !CERT.includes(c.cert)) {
    fail(where, `"cert" 是 ${JSON.stringify(c.cert)}，不在允許值內`, `只能填：${CERT.join(" / ")}。不確定發什麼證就填 "unknown"。`);
  }
  if (c.cats !== undefined) {
    if (!Array.isArray(c.cats)) {
      fail(where, `"cats" 必須是陣列`, '例如 ["27001", "short"]');
    } else {
      c.cats.forEach(cat => {
        if (!CATS.includes(cat)) {
          fail(where, `分類 "${cat}" 不在允許值內`, `只能填：${CATS.join(" / ")}`);
        }
      });
      if (c.cats.length === 0) {
        fail(where, `"cats" 是空陣列`, "至少要有一個分類，不然這筆課程在任何篩選下都不會出現。");
      }
    }
  }

  // 價格
  if (c.price !== undefined && c.price !== null && typeof c.price !== "number") {
    fail(where, `"price" 必須是數字或 null，現在是 ${JSON.stringify(c.price)}`, '寫 8550 不要寫 "8,550" 或 "8550元"。價格未公開就填 null。');
  }
  if (typeof c.price === "number" && c.price < 0) {
    fail(where, `"price" 是負數`, "價格不能小於 0。免費填 0。");
  }
  if (c.was !== undefined) {
    if (typeof c.was !== "number") {
      fail(where, `"was" 必須是數字`, '"was" 是原價（會顯示成刪除線），寫 50000 不要寫 "50,000"。');
    } else if (typeof c.price === "number" && c.was <= c.price) {
      fail(where, `原價 "was" (${c.was}) 沒有高於現價 "price" (${c.price})`, "原價要比現價高才有意義；沒有折扣就把 was 整個拿掉。");
    }
  }

  // 網址
  if (c.url !== undefined && c.url !== null) {
    if (typeof c.url !== "string" || !/^https?:\/\//.test(c.url)) {
      fail(where, `"url" 必須是 http(s) 開頭的網址或 null`, "沒有公開報名頁就填 null，頁面會顯示「需洽業務窗口」。");
    }
  }

  // 提醒（不會擋 CI，但值得看一眼）
  if (isDate(c.end) && asDate(c.end) && asDate(c.end) < new Date(new Date().setHours(0, 0, 0, 0))) {
    warn(where, `這梯已經結束了（${c.end}）— 過期的課程預設不顯示，確定要留著嗎？`);
  }
  if (c.note && c.note.length > 200) {
    warn(where, `"note" 有 ${c.note.length} 個字，版面上會很擠 — 建議壓在 120 字以內。`);
  }
});

// ---- 3. meta ----
if (!payload.meta || !isDate(payload.meta.updated)) {
  fail("meta", '缺少 "meta.updated" 或格式不是 YYYY-MM-DD', "改動資料時請一併把 meta.updated 換成今天的日期。");
}

// ---- 4. 報告 ----
const n = payload.courses.length;

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} 個提醒（不會擋住合併）：\n`);
  warnings.forEach(w => console.log(`  · ${w.where}\n    ${w.msg}\n`));
}

if (errors.length) {
  console.error(`\n✗ 檢查沒過：${n} 筆課程裡有 ${errors.length} 個問題\n`);
  errors.forEach((e, i) => {
    console.error(`  ${i + 1}. ${e.where}`);
    console.error(`     問題：${e.msg}`);
    console.error(`     怎麼修：${e.fix}\n`);
  });
  console.error("  修好之後在本機跑 `node scripts/validate.mjs` 確認，再 push 上來。\n");
  process.exit(1);
}

console.log(`\n✓ 檢查通過：${n} 筆課程，格式全部正確。\n`);
