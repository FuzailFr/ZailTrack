import { NextResponse } from "next/server";
import { getDb, initDbSchema } from "@/lib/db";
import { logBotActivity } from "@/lib/logger";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper kirim pesan balasan Telegram dengan dukungan Inline Keyboard
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: any
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not configured in environment variables");
    return null;
  }
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error("Gagal kirim pesan telegram:", err);
    return null;
  }
}

// Helper edit pesan telegram (untuk pagination inline keyboard)
async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error("Gagal edit pesan telegram:", err);
    return null;
  }
}

// Helper jawab callback query (agar tombol tidak terus loading)
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
        show_alert: false,
      }),
    });
  } catch (err) {
    console.error("Gagal jawab callback query:", err);
  }
}

// Format Rupiah untuk balasan bot yang rapi
function formatRupiah(num: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}

// Menu Navigasi Interaktif berdasarkan Role Pengguna
function buildMainMenuKeyboard(role: string = "user") {
  const keyboard: any[][] = [
    [
      { text: "💰 Cek Saldo", callback_data: "cmd:saldo" },
      { text: "📋 Riwayat", callback_data: "history:1" },
    ],
    [
      { text: "👤 Akun Saya", callback_data: "cmd:acc" },
      { text: "⚡ Status Server", callback_data: "cmd:status" },
    ],
  ];

  if (role === "admin" || role === "developer") {
    keyboard.push([
      { text: "👑 Admin Stats", callback_data: "cmd:admin_stats" },
      { text: "👥 User List", callback_data: "cmd:admin_users" },
    ]);
  }

  if (role === "developer") {
    keyboard.push([
      { text: "🛠 DB Telemetry", callback_data: "cmd:dev_info" },
    ]);
  }

  keyboard.push([
    { text: "📖 Panduan", callback_data: "cmd:help" },
    { text: "🌐 Buka Dashboard", url: "https://zail-track.vercel.app/dashboard" },
  ]);

  return { inline_keyboard: keyboard };
}

// Smart Parser: Mengenali bahasa natural, singkatan angka (k, rb, jt), tanda (+/-), dan kata kunci
function parseTransactionText(rawText: string): {
  tipe: "income" | "expense";
  jumlah: number;
  deskripsi: string;
} | null {
  const text = rawText.trim();
  if (!text) return null;

  let tipe: "income" | "expense" = "expense";
  const lower = text.toLowerCase();

  const isIncomeKeywords = [
    "/masuk",
    "masuk",
    "pemasukan",
    "income",
    "gaji",
    "honor",
    "terima",
    "dapat",
    "bonus",
    "cair",
    "transferan",
  ];

  if (
    text.startsWith("+") ||
    isIncomeKeywords.some((kw) => lower.startsWith(kw) || lower.endsWith(kw))
  ) {
    tipe = "income";
  } else if (
    text.startsWith("-") ||
    lower.startsWith("/keluar") ||
    lower.startsWith("keluar") ||
    lower.startsWith("pengeluaran") ||
    lower.startsWith("beli") ||
    lower.startsWith("bayar") ||
    lower.startsWith("jajan")
  ) {
    tipe = "expense";
  }

  const numberRegex = /(\d+(?:[.,]\d+)*)(?:\s*(jt|juta|k|rb|ribu)(?![a-zA-Z]))?/i;
  const match = text.match(numberRegex);
  if (!match) return null;

  const rawNumStr = match[1];
  const suffix = (match[2] || "").toLowerCase();
  let parsedAmount = 0;

  if (suffix === "jt" || suffix === "juta") {
    const decimalVal = parseFloat(rawNumStr.replace(/,/g, "."));
    parsedAmount = Math.round(decimalVal * 1_000_000);
  } else if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
    const decimalVal = parseFloat(rawNumStr.replace(/,/g, "."));
    parsedAmount = Math.round(decimalVal * 1_000);
  } else {
    const cleanPlain = rawNumStr.replace(/[^0-9]/g, "");
    parsedAmount = parseInt(cleanPlain, 10);
  }

  if (isNaN(parsedAmount) || parsedAmount <= 0) return null;

  let desc = text
    .replace(match[0], "")
    .replace(/^\/?(masuk|keluar|income|expense|beli|bayar|jajan)\s*/i, "")
    .replace(/^[+\-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!desc) {
    desc = tipe === "income" ? "Pemasukan Telegram" : "Pengeluaran Telegram";
  }

  return {
    tipe,
    jumlah: parsedAmount,
    deskripsi: desc,
  };
}

export async function POST(request: Request) {
  const startTime = performance.now();
  try {
    const update = await request.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: true });
    }

    await initDbSchema();
    const sql = getDb();

    // ==============================================================
    // 1. HANDLE CALLBACK QUERY (Inline Keyboard Clicks)
    // ==============================================================
    if (update.callback_query) {
      const cb = update.callback_query;
      const callbackId = cb.id;
      const cbChatId = cb.message?.chat?.id;
      const cbMessageId = cb.message?.message_id;
      const cbData = cb.data || "";

      if (!cbChatId) {
        await answerCallbackQuery(callbackId);
        return NextResponse.json({ ok: true });
      }

      // Ambil user terkait chat ID ini
      const linked = await sql`
        SELECT id, username, role, status FROM users WHERE telegram_chat_id = ${cbChatId} LIMIT 1
      `;
      const user = linked[0];

      // Handle Pagination Riwayat Transaksi (format: history:<page>)
      if (cbData.startsWith("history:")) {
        await answerCallbackQuery(callbackId);
        if (!user) {
          await sendTelegramMessage(cbChatId, "⚠️ Akun belum terhubung ke ZailTrack.");
          return NextResponse.json({ ok: true });
        }

        const page = parseInt(cbData.split(":")[1], 10) || 1;
        const pageSize = 5;
        const offset = (page - 1) * pageSize;

        const [txList, countRes] = await Promise.all([
          sql`
            SELECT id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_str
            FROM transactions
            WHERE user_id = ${user.id}
            ORDER BY tanggal DESC, id DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `,
          sql`
            SELECT COUNT(*)::int AS total FROM transactions WHERE user_id = ${user.id}
          `,
        ]);

        const totalTx = countRes[0]?.total || 0;
        const totalPages = Math.ceil(totalTx / pageSize) || 1;

        let msg = `📋 <b>Riwayat Transaksi (Halaman ${page}/${totalPages})</b>\n\n`;
        if (txList.length === 0) {
          msg += `<i>Belum ada catatan transaksi pada halaman ini.</i>\n`;
        } else {
          txList.forEach((tx: any, idx: number) => {
            const icon = tx.tipe === "income" ? "🟢" : "🔴";
            const sign = tx.tipe === "income" ? "+" : "-";
            msg += `${offset + idx + 1}. ${icon} <b>${sign}${formatRupiah(Number(tx.jumlah))}</b>\n`;
            msg += `    📝 ${tx.deskripsi} <i>(${tx.tanggal_str})</i>\n`;
          });
        }
        msg += `\n<i>Total transaksi Anda: ${totalTx} catatan</i>`;

        // Keyboard navigasi pagination
        const navRow = [];
        if (page > 1) {
          navRow.push({ text: "◀️ Sebelumnya", callback_data: `history:${page - 1}` });
        }
        if (page < totalPages) {
          navRow.push({ text: "Berikutnya ▶️", callback_data: `history:${page + 1}` });
        }

        const buttons: any[][] = [];
        if (navRow.length > 0) buttons.push(navRow);
        buttons.push([
          { text: "💰 Cek Saldo", callback_data: "cmd:saldo" },
          { text: "🏠 Menu Utama", callback_data: "cmd:menu" },
        ]);

        if (cbMessageId) {
          await editTelegramMessage(cbChatId, cbMessageId, msg, { inline_keyboard: buttons });
        } else {
          await sendTelegramMessage(cbChatId, msg, { inline_keyboard: buttons });
        }

        await logBotActivity({
          chatId: cbChatId,
          userId: user.id,
          username: user.username,
          command: `callback:history:${page}`,
          responseTimeMs: Math.round(performance.now() - startTime),
        });

        return NextResponse.json({ ok: true });
      }

      // Handle Command Callbacks: cmd:<name>
      if (cbData.startsWith("cmd:")) {
        const cmdName = cbData.replace("cmd:", "");
        await answerCallbackQuery(callbackId);

        if (cmdName === "menu" || cmdName === "help") {
          const userRole = user ? user.role : "user";
          const helpMsg =
            `📖 <b>ZailTrack Cockpit Bot — Menu Utama</b>\n\n` +
            `Catat dan pantau keuangan Anda secara instan dari Telegram.\n\n` +
            `<b>Format Cepat Catat Transaksi:</b>\n` +
            `• <code>keluar 35k kopi</code>\n` +
            `• <code>masuk 1.5jt freelance</code>\n` +
            `• <code>beli bensin 40000</code>\n` +
            `• <code>-15rb parkir</code> / <code>+500k bonus</code>\n\n` +
            `Gunakan tombol interaktif di bawah untuk navigasi cepat:`;

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, helpMsg, buildMainMenuKeyboard(userRole));
          } else {
            await sendTelegramMessage(cbChatId, helpMsg, buildMainMenuKeyboard(userRole));
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "saldo") {
          if (!user) {
            await sendTelegramMessage(cbChatId, "⚠️ Akun Telegram belum terhubung ke ZailTrack.");
            return NextResponse.json({ ok: true });
          }
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          const monthNames = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
          ];

          const sumRes = await sql`
            SELECT 
              COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_expense
            FROM transactions
            WHERE user_id = ${user.id}
              AND EXTRACT(MONTH FROM tanggal) = ${currentMonth}
              AND EXTRACT(YEAR FROM tanggal) = ${currentYear}
          `;

          const inc = Number(sumRes[0]?.total_income || 0);
          const exp = Number(sumRes[0]?.total_expense || 0);
          const net = inc - exp;

          const saldoMsg =
            `💰 <b>Ringkasan Saldo Bulan ${monthNames[currentMonth - 1]} ${currentYear}</b>\n\n` +
            `🟢 <b>Pemasukan:</b> ${formatRupiah(inc)}\n` +
            `🔴 <b>Pengeluaran:</b> ${formatRupiah(exp)}\n` +
            `💼 <b>Saldo Bersih:</b> ${formatRupiah(net)}\n\n` +
            `👤 Akun: <b>@${user.username}</b>`;

          const buttons = {
            inline_keyboard: [
              [
                { text: "📋 Lihat Riwayat", callback_data: "history:1" },
                { text: "🏠 Menu Utama", callback_data: "cmd:menu" },
              ]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, saldoMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, saldoMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "acc") {
          if (!user) {
            await sendTelegramMessage(cbChatId, "⚠️ Akun belum terhubung.");
            return NextResponse.json({ ok: true });
          }

          const accInfo = await sql`
            SELECT id, username, role, status, created_at FROM users WHERE id = ${user.id} LIMIT 1
          `;
          const u = accInfo[0];
          const joinedDate = new Date(u.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          const roleDisplay = u.role === "developer" ? "DEVELOPER (Root)" : u.role === "admin" ? "ADMIN" : "USER";

          const accMsg =
            `👤 <b>Informasi Akun ZailTrack</b>\n\n` +
            `• <b>ID Akun:</b> #${u.id}\n` +
            `• <b>Username:</b> <code>${u.username}</code>\n` +
            `• <b>Hak Akses:</b> <b>${roleDisplay}</b>\n` +
            `• <b>Status Akun:</b> ${u.status === "active" ? "🟢 Aktif" : "🔴 " + u.status}\n` +
            `• <b>Chat ID:</b> <code>${cbChatId}</code>\n` +
            `• <b>Terdaftar:</b> ${joinedDate}\n` +
            `• <b>Keamanan:</b> Bcrypt Salt 10 Hash (Zero-Trust)`;

          const buttons = {
            inline_keyboard: [
              [
                { text: "💰 Cek Saldo", callback_data: "cmd:saldo" },
                { text: "🏠 Menu Utama", callback_data: "cmd:menu" },
              ]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, accMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, accMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "status") {
          const pingStart = performance.now();
          const [, latestTx] = await Promise.all([
            sql`SELECT 1 as ping`,
            sql`SELECT created_at FROM transactions ORDER BY id DESC LIMIT 1`,
          ]);
          const latency = Math.round(performance.now() - pingStart);

          const statusMsg =
            `⚡ <b>Status Sistem & Telemetri</b>\n\n` +
            `• <b>Server Status:</b> 🟢 Online (App Router Turbopack)\n` +
            `• <b>Database:</b> Neon PostgreSQL Serverless\n` +
            `• <b>Latensi Query:</b> ${latency} ms\n` +
            `• <b>Protokol:</b> TLS 1.3 / HTTPS Secured\n` +
            `• <b>Waktu Pengecekan:</b> ${new Date().toLocaleTimeString("id-ID")} WIB`;

          const buttons = {
            inline_keyboard: [
              [{ text: "🔄 Refresh Status", callback_data: "cmd:status" }],
              [{ text: "🏠 Menu Utama", callback_data: "cmd:menu" }]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, statusMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, statusMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "admin_stats") {
          if (!user || (user.role !== "admin" && user.role !== "developer")) {
            await sendTelegramMessage(cbChatId, "⛔ <b>Akses Ditolak:</b> Fitur ini khusus Admin/Developer.");
            return NextResponse.json({ ok: true });
          }

          const [usersStats, txStats, cashflow] = await Promise.all([
            sql`
              SELECT 
                COUNT(*)::int AS total,
                COUNT(CASE WHEN role = 'admin' THEN 1 END)::int AS admins,
                COUNT(CASE WHEN role = 'developer' THEN 1 END)::int AS developers,
                COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active_count
              FROM users
            `,
            sql`SELECT COUNT(*)::int AS total_tx FROM transactions`,
            sql`
              SELECT 
                COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_in,
                COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_out
              FROM transactions
            `
          ]);

          const uStat = usersStats[0];
          const tStat = txStats[0];
          const cStat = cashflow[0];

          const adminMsg =
            `👑 <b>Admin Platform Cockpit Summary</b>\n\n` +
            `👥 <b>Statistik Pengguna:</b>\n` +
            `• Total Pengguna: <b>${uStat.total}</b> akun\n` +
            `• Admin / Developer: <b>${uStat.admins}</b> admin / <b>${uStat.developers}</b> dev\n` +
            `• Akun Aktif: <b>${uStat.active_count}</b>\n\n` +
            `📊 <b>Platform Ledger:</b>\n` +
            `• Total Transaksi: <b>${tStat.total_tx}</b> catatan\n` +
            `• Total Volume Masuk: ${formatRupiah(Number(cStat.total_in))}\n` +
            `• Total Volume Keluar: ${formatRupiah(Number(cStat.total_out))}\n\n` +
            `🌐 Buka Admin Dashboard web untuk kontrol penuh.`;

          const buttons = {
            inline_keyboard: [
              [
                { text: "👥 Lihat User List", callback_data: "cmd:admin_users" },
                { text: "🏠 Menu Utama", callback_data: "cmd:menu" }
              ]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, adminMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, adminMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "admin_users") {
          if (!user || (user.role !== "admin" && user.role !== "developer")) {
            await sendTelegramMessage(cbChatId, "⛔ <b>Akses Ditolak:</b> Fitur ini khusus Admin/Developer.");
            return NextResponse.json({ ok: true });
          }

          const userList = await sql`
            SELECT id, username, role, status FROM users ORDER BY id DESC LIMIT 8
          `;

          let uMsg = `👥 <b>Daftar 8 Pengguna Terbaru:</b>\n\n`;
          userList.forEach((u: any) => {
            const rTag = u.role === "developer" ? "[DEV]" : u.role === "admin" ? "[ADMIN]" : "[USER]";
            const statusIcon = u.status === "active" ? "🟢" : "🔴";
            uMsg += `• #${u.id} <b>@${u.username}</b> ${rTag} ${statusIcon}\n`;
          });
          uMsg += `\n<i>Kelola role dan status lengkap via Admin Web Dashboard.</i>`;

          const buttons = {
            inline_keyboard: [
              [
                { text: "👑 Admin Stats", callback_data: "cmd:admin_stats" },
                { text: "🏠 Menu Utama", callback_data: "cmd:menu" }
              ]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, uMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, uMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }

        if (cmdName === "dev_info") {
          if (!user || user.role !== "developer") {
            await sendTelegramMessage(cbChatId, "⛔ <b>Akses Ditolak:</b> Fitur ini khusus Developer.");
            return NextResponse.json({ ok: true });
          }

          const [dbVer, tableCount, logCount] = await Promise.all([
            sql`SELECT version() as ver`,
            sql`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'`,
            sql`SELECT count(*)::int as count FROM audit_logs`,
          ]);

          const devMsg =
            `🛠 <b>Developer Engine Cockpit</b>\n\n` +
            `• <b>Engine:</b> Neon PostgreSQL Serverless\n` +
            `• <b>Versi:</b> ${(dbVer[0]?.ver || "").split(" on ")[0]}\n` +
            `• <b>Tabel Database:</b> ${tableCount[0]?.count || 0} tabel publik\n` +
            `• <b>Audit Trail:</b> ${logCount[0]?.count || 0} log tersimpan\n` +
            `• <b>Runtime:</b> Next.js 16.4.5 + React 19 App Router`;

          const buttons = {
            inline_keyboard: [
              [{ text: "🏠 Menu Utama", callback_data: "cmd:menu" }]
            ]
          };

          if (cbMessageId) {
            await editTelegramMessage(cbChatId, cbMessageId, devMsg, buttons);
          } else {
            await sendTelegramMessage(cbChatId, devMsg, buttons);
          }
          return NextResponse.json({ ok: true });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // 2. HANDLE TEXT MESSAGES & COMMANDS
    // ==============================================================
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat?.id;
    const rawText = (message.text || "").trim();

    if (!chatId || !rawText) return NextResponse.json({ ok: true });

    // Cek user terkait chatId
    const linkedUsers = await sql`
      SELECT id, username, role, status FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
    `;
    const currentUser = linkedUsers[0] || null;
    if (currentUser) {
      sql`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ${currentUser.id}`.catch(() => {});
    }
    const userRole = currentUser ? currentUser.role : "user";

    const lowerCmd = rawText.toLowerCase().split(" ")[0].split("@")[0];

    // ==============================================================
    // COMMAND: /start [link_code]
    // ==============================================================
    if (lowerCmd === "/start") {
      const parts = rawText.split(" ");
      const linkCode = parts[1]?.trim();

      if (linkCode) {
        const matchingUsers = await sql`
          SELECT id, username, role FROM users WHERE telegram_link_code = ${linkCode} LIMIT 1
        `;

        if (matchingUsers.length > 0) {
          const u = matchingUsers[0];
          await sql`
            UPDATE users 
            SET telegram_chat_id = ${chatId}, telegram_link_code = NULL 
            WHERE id = ${u.id}
          `;

          await logBotActivity({
            chatId,
            userId: u.id,
            username: u.username,
            command: "/start:link",
            responseTimeMs: Math.round(performance.now() - startTime),
          });

          await sendTelegramMessage(
            chatId,
            `✅ <b>Akun Berhasil Terhubung!</b>\n\n` +
            `Halo <b>@${u.username}</b>! Akun Anda terhubung dengan hak akses <b>${u.role.toUpperCase()}</b>.\n\n` +
            `Anda dapat langsung mencatat transaksi secara otomatis atau menggunakan tombol menu di bawah:`,
            buildMainMenuKeyboard(u.role)
          );
          return NextResponse.json({ ok: true });
        }
      }

      if (currentUser) {
        await sendTelegramMessage(
          chatId,
          `👋 Halo <b>@${currentUser.username}</b>!\n\n` +
          `Akun Telegram Anda aktif terhubung ke ZailTrack sebagai <b>${userRole.toUpperCase()}</b>.\n\n` +
          `Ketik transaksi langsung (contoh: <code>keluar 35k kopi</code>) atau gunakan menu di bawah:`,
          buildMainMenuKeyboard(userRole)
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Selamat datang di ZailTrack Bot!</b>\n\n` +
          `Bot ini mencatat transaksi keuangan dan menyinkronkannya langsung ke dashboard web.\n\n` +
          `⚠️ <b>Akun Anda belum terhubung.</b>\n` +
          `Buka dashboard web untuk menghubungkan akun Telegram Anda:`,
          {
            inline_keyboard: [
              [{ text: "🌐 Buka Web Dashboard", url: "https://zail-track.vercel.app/dashboard" }],
              [{ text: "📖 Panduan Penggunaan", callback_data: "cmd:help" }]
            ]
          }
        );
      }

      await logBotActivity({
        chatId,
        userId: currentUser?.id,
        username: currentUser?.username,
        command: "/start",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /help, /bantuan, /menu
    // ==============================================================
    if (lowerCmd === "/help" || lowerCmd === "/bantuan" || lowerCmd === "/menu") {
      await sendTelegramMessage(
        chatId,
        `📖 <b>Pusat Kendali ZailTrack Bot</b>\n\n` +
        `<b>Daftar Perintah Teks:</b>\n` +
        `• /saldo — Ringkasan pemasukan, pengeluaran & saldo bulan ini\n` +
        `• /terakhir — 5 transaksi terakhir dengan navigasi halaman\n` +
        `• /status — Latensi koneksi database & status server\n` +
        `• /acc — Profil akun, hak akses & status enkripsi\n` +
        `• /admin — Ringkasan platform khusus Admin\n` +
        `• /menu — Tampilkan tombol menu interaktif\n\n` +
        `<b>Contoh Catat Transaksi Cepat:</b>\n` +
        `• <code>beli bensin 35k</code>\n` +
        `• <code>keluar 50000 makan</code>\n` +
        `• <code>masuk 1.5jt freelance</code>\n` +
        `• <code>-15rb jajan</code> / <code>+500k transfer</code>`,
        buildMainMenuKeyboard(userRole)
      );

      await logBotActivity({
        chatId,
        userId: currentUser?.id,
        username: currentUser?.username,
        command: "/help",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /saldo & /kas
    // ==============================================================
    if (lowerCmd === "/saldo" || lowerCmd === "/kas") {
      if (!currentUser) {
        await sendTelegramMessage(chatId, "⚠️ Akun belum terhubung ke ZailTrack.");
        return NextResponse.json({ ok: true });
      }

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];

      const sumRes = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_expense
        FROM transactions
        WHERE user_id = ${currentUser.id}
          AND EXTRACT(MONTH FROM tanggal) = ${currentMonth}
          AND EXTRACT(YEAR FROM tanggal) = ${currentYear}
      `;

      const inc = Number(sumRes[0]?.total_income || 0);
      const exp = Number(sumRes[0]?.total_expense || 0);
      const net = inc - exp;

      await sendTelegramMessage(
        chatId,
        `💰 <b>Ringkasan Saldo Bulan ${monthNames[currentMonth - 1]} ${currentYear}</b>\n\n` +
        `🟢 <b>Pemasukan:</b> ${formatRupiah(inc)}\n` +
        `🔴 <b>Pengeluaran:</b> ${formatRupiah(exp)}\n` +
        `💼 <b>Saldo Bersih:</b> ${formatRupiah(net)}\n\n` +
        `👤 Akun: <b>@${currentUser.username}</b>`,
        {
          inline_keyboard: [
            [
              { text: "📋 Lihat Riwayat", callback_data: "history:1" },
              { text: "🏠 Menu Utama", callback_data: "cmd:menu" },
            ]
          ]
        }
      );

      await logBotActivity({
        chatId,
        userId: currentUser.id,
        username: currentUser.username,
        command: "/saldo",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /terakhir & /riwayat
    // ==============================================================
    if (lowerCmd === "/terakhir" || lowerCmd === "/riwayat") {
      if (!currentUser) {
        await sendTelegramMessage(chatId, "⚠️ Akun belum terhubung ke ZailTrack.");
        return NextResponse.json({ ok: true });
      }

      const page = 1;
      const pageSize = 5;
      const [txList, countRes] = await Promise.all([
        sql`
          SELECT id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_str
          FROM transactions
          WHERE user_id = ${currentUser.id}
          ORDER BY tanggal DESC, id DESC
          LIMIT ${pageSize}
        `,
        sql`SELECT COUNT(*)::int AS total FROM transactions WHERE user_id = ${currentUser.id}`,
      ]);

      const totalTx = countRes[0]?.total || 0;
      const totalPages = Math.ceil(totalTx / pageSize) || 1;

      if (txList.length === 0) {
        await sendTelegramMessage(
          chatId,
          `📋 <i>Belum ada catatan transaksi yang dicatat.</i>\n\n` +
          `Ketik pesan baru untuk mencatat, contoh: <code>keluar 35k makan siang</code>`
        );
        return NextResponse.json({ ok: true });
      }

      let textMsg = `📋 <b>5 Transaksi Terakhir (Hal 1/${totalPages}):</b>\n\n`;
      txList.forEach((tx: any, idx: number) => {
        const icon = tx.tipe === "income" ? "🟢" : "🔴";
        const sign = tx.tipe === "income" ? "+" : "-";
        textMsg += `${idx + 1}. ${icon} <b>${sign}${formatRupiah(Number(tx.jumlah))}</b>\n`;
        textMsg += `    📝 ${tx.deskripsi} <i>(${tx.tanggal_str})</i>\n`;
      });

      const navRow = [];
      if (totalPages > 1) {
        navRow.push({ text: "Berikutnya ▶️", callback_data: "history:2" });
      }

      const buttons: any[][] = [];
      if (navRow.length > 0) buttons.push(navRow);
      buttons.push([
        { text: "💰 Cek Saldo", callback_data: "cmd:saldo" },
        { text: "🏠 Menu Utama", callback_data: "cmd:menu" }
      ]);

      await sendTelegramMessage(chatId, textMsg, { inline_keyboard: buttons });

      await logBotActivity({
        chatId,
        userId: currentUser.id,
        username: currentUser.username,
        command: "/terakhir",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /status & /ping
    // ==============================================================
    if (lowerCmd === "/status" || lowerCmd === "/ping") {
      const pingStart = performance.now();
      const [, latestTx] = await Promise.all([
        sql`SELECT 1 as ping`,
        sql`SELECT created_at FROM transactions ORDER BY id DESC LIMIT 1`,
      ]);
      const latency = Math.round(performance.now() - pingStart);

      let lastTxInfo = "Belum ada transaksi";
      if (latestTx.length > 0 && latestTx[0].created_at) {
        lastTxInfo =
          new Date(latestTx[0].created_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          }) + " WIB";
      }

      await sendTelegramMessage(
        chatId,
        `⚡ <b>Status Sistem ZailTrack (v2.2)</b>\n\n` +
        `• <b>Server Web:</b> 🟢 Online (App Router Turbopack)\n` +
        `• <b>Database:</b> Neon Serverless PostgreSQL\n` +
        `• <b>Latensi Query:</b> ${latency} ms\n` +
        `• <b>Transaksi Terakhir:</b> ${lastTxInfo}\n` +
        `• <b>Hak Akses Anda:</b> ${userRole.toUpperCase()}\n` +
        `• <b>Waktu Pengecekan:</b> ${new Date().toLocaleTimeString("id-ID")} WIB`,
        {
          inline_keyboard: [
            [{ text: "🔄 Refresh Status", callback_data: "cmd:status" }],
            [{ text: "🏠 Menu Utama", callback_data: "cmd:menu" }]
          ]
        }
      );

      await logBotActivity({
        chatId,
        userId: currentUser?.id,
        username: currentUser?.username,
        command: "/status",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /acc & /akun & /profil
    // ==============================================================
    if (lowerCmd === "/acc" || lowerCmd === "/akun" || lowerCmd === "/profil") {
      if (!currentUser) {
        await sendTelegramMessage(chatId, "⚠️ Akun Telegram belum terhubung ke ZailTrack.");
        return NextResponse.json({ ok: true });
      }

      const joined = await sql`
        SELECT created_at FROM users WHERE id = ${currentUser.id} LIMIT 1
      `;
      const joinedDate = new Date(joined[0]?.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      const roleDisplay = currentUser.role === "developer" ? "DEVELOPER (Full Root)" : currentUser.role === "admin" ? "ADMIN" : "USER";

      await sendTelegramMessage(
        chatId,
        `👤 <b>Informasi Akun ZailTrack</b>\n\n` +
        `• <b>User ID:</b> #${currentUser.id}\n` +
        `• <b>Username:</b> <code>${currentUser.username}</code>\n` +
        `• <b>Hak Akses (Role):</b> <b>${roleDisplay}</b>\n` +
        `• <b>Status:</b> ${currentUser.status === "active" ? "🟢 Aktif" : "🔴 " + currentUser.status}\n` +
        `• <b>Telegram Chat ID:</b> <code>${chatId}</code>\n` +
        `• <b>Terdaftar Sejak:</b> ${joinedDate}\n` +
        `• <b>Enkripsi Password:</b> Bcrypt Salt 10 Hash (Anti-Bruteforce)`,
        {
          inline_keyboard: [
            [
              { text: "💰 Cek Saldo", callback_data: "cmd:saldo" },
              { text: "🏠 Menu Utama", callback_data: "cmd:menu" },
            ]
          ]
        }
      );

      await logBotActivity({
        chatId,
        userId: currentUser.id,
        username: currentUser.username,
        command: "/acc",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND: /admin & /admin_stats (Khusus Admin/Developer)
    // ==============================================================
    if (lowerCmd === "/admin" || lowerCmd === "/admin_stats") {
      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "developer")) {
        await sendTelegramMessage(chatId, "⛔ <b>Akses Ditolak:</b> Perintah ini hanya untuk Admin/Developer.");
        return NextResponse.json({ ok: true });
      }

      const [usersStats, txStats, cashflow] = await Promise.all([
        sql`
          SELECT 
            COUNT(*)::int AS total,
            COUNT(CASE WHEN role = 'admin' THEN 1 END)::int AS admins,
            COUNT(CASE WHEN role = 'developer' THEN 1 END)::int AS developers,
            COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active_count
          FROM users
        `,
        sql`SELECT COUNT(*)::int AS total_tx FROM transactions`,
        sql`
          SELECT 
            COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_in,
            COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_out
          FROM transactions
        `
      ]);

      const uStat = usersStats[0];
      const tStat = txStats[0];
      const cStat = cashflow[0];

      await sendTelegramMessage(
        chatId,
        `👑 <b>Admin Platform Summary</b>\n\n` +
        `👥 <b>Statistik Pengguna:</b>\n` +
        `• Total Pengguna: <b>${uStat.total}</b> akun\n` +
        `• Admin: <b>${uStat.admins}</b> | Dev: <b>${uStat.developers}</b>\n` +
        `• Akun Aktif: <b>${uStat.active_count}</b>\n\n` +
        `📊 <b>Ledger Global:</b>\n` +
        `• Total Catatan Transaksi: <b>${tStat.total_tx}</b>\n` +
        `• Pemasukan Platform: ${formatRupiah(Number(cStat.total_in))}\n` +
        `• Pengeluaran Platform: ${formatRupiah(Number(cStat.total_out))}\n\n` +
        `🌐 Akses database langsung dan manajemen user tersedia di Admin Web Dashboard.`,
        {
          inline_keyboard: [
            [
              { text: "👥 User List", callback_data: "cmd:admin_users" },
              { text: "🏠 Menu Utama", callback_data: "cmd:menu" }
            ]
          ]
        }
      );

      await logBotActivity({
        chatId,
        userId: currentUser.id,
        username: currentUser.username,
        command: "/admin",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // 3. HANDLE PENCATATAN TRANSAKSI (Natural Language Parser)
    // ==============================================================
    if (!currentUser) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Akun Telegram Anda belum terhubung ke ZailTrack.</b>\n\n` +
        `Buka web dashboard dan klik tombol <b>Telegram Bot</b> untuk menghubungkan akun.`,
        {
          inline_keyboard: [
            [{ text: "🌐 Buka Web Dashboard", url: "https://zail-track.vercel.app/dashboard" }]
          ]
        }
      );
      return NextResponse.json({ ok: true });
    }

    const parsed = parseTransactionText(rawText);
    if (!parsed) {
      await sendTelegramMessage(
        chatId,
        `🤔 <i>Pesan tidak dikenali sebagai format transaksi atau perintah.</i>\n\n` +
        `<b>Contoh format yang didukung:</b>\n` +
        `• <code>keluar 25000 kopi</code>\n` +
        `• <code>masuk 500000 bonus</code>\n` +
        `• <code>beli bensin 35k</code>\n` +
        `• <code>-15rb parkir</code> / <code>+1.5jt gaji</code>\n\n` +
        `Ketik /help untuk panduan lengkap.`,
        buildMainMenuKeyboard(userRole)
      );

      await logBotActivity({
        chatId,
        userId: currentUser.id,
        username: currentUser.username,
        command: "unknown_text",
        rawText,
        status: "error",
        responseTimeMs: Math.round(performance.now() - startTime),
      });

      return NextResponse.json({ ok: true });
    }

    // Simpan transaksi
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const tanggalHariIni = nowWIB.toISOString().slice(0, 10);
    const tanggalDisplay = tanggalHariIni.split("-").reverse().join("/");

    await sql`
      INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal)
      VALUES (${currentUser.id}, ${parsed.tipe}, ${parsed.jumlah}, ${parsed.deskripsi}, ${tanggalHariIni})
    `;

    const icon = parsed.tipe === "income" ? "🟢" : "🔴";
    const tipeLabel = parsed.tipe === "income" ? "PEMASUKAN (+)" : "PENGELUARAN (-)";

    await sendTelegramMessage(
      chatId,
      `✅ <b>Transaksi Berhasil Dicatat!</b>\n\n` +
      `${icon} <b>Tipe:</b> ${tipeLabel}\n` +
      `💰 <b>Nominal:</b> <b>${formatRupiah(parsed.jumlah)}</b>\n` +
      `📝 <b>Keterangan:</b> ${parsed.deskripsi}\n` +
      `📅 <b>Tanggal:</b> ${tanggalDisplay}\n` +
      `👤 <b>Akun:</b> @${currentUser.username}\n\n` +
      `🌐 <i>Tersinkronisasi otomatis ke Web Ledger & Sheets!</i>`,
      {
        inline_keyboard: [
          [
            { text: "💰 Cek Saldo Baru", callback_data: "cmd:saldo" },
            { text: "📋 Riwayat", callback_data: "history:1" },
          ],
          [
            { text: "🌐 Buka Dashboard", url: "https://zail-track.vercel.app/dashboard" }
          ]
        ]
      }
    );

    await logBotActivity({
      chatId,
      userId: currentUser.id,
      username: currentUser.username,
      command: `tx:${parsed.tipe}`,
      rawText: `${parsed.tipe} ${parsed.jumlah} ${parsed.deskripsi}`,
      status: "success",
      responseTimeMs: Math.round(performance.now() - startTime),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
