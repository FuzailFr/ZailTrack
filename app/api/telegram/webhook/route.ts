import { NextResponse } from "next/server";
import { getDb, initDbSchema } from "@/lib/db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper kirim pesan balasan Telegram
async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not configured in environment variables");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Gagal kirim pesan telegram:", err);
  }
}

// Format Rupiah untuk balasan bot yang rapi
function formatRupiah(num: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}

// Smart Parser: Mengenali bahasa natural, singkatan angka (k, rb, jt), tanda (+/-), dan kata kunci
function parseTransactionText(rawText: string): {
  tipe: "income" | "expense";
  jumlah: number;
  deskripsi: string;
} | null {
  const text = rawText.trim();
  if (!text) return null;

  // 1. Deteksi Tipe (Pemasukan vs Pengeluaran)
  let tipe: "income" | "expense" = "expense"; // Default pengeluaran
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

  // 2. Ekstrak Nominal Angka (Mendukung 50k, 1.5jt, 25rb, 150000, 100.000, 1.000.000)
  // Suffix (k, rb, ribu, jt, juta) wajib terisolasi atau diakhiri batas kata (?![a-zA-Z])
  // sehingga kata seperti 'kopi' tidak dianggap sebagai suffix 'k'!
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
    // Angka murni tanpa suffix, bersihkan format titik/koma ribuan: misal 50.000 -> 50000
    const cleanPlain = rawNumStr.replace(/[^0-9]/g, "");
    parsedAmount = parseInt(cleanPlain, 10);
  }

  if (isNaN(parsedAmount) || parsedAmount <= 0) return null;

  // 3. Ekstrak Deskripsi (Hapus angka yang cocok, kata kunci awal, dan tanda +/-)
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
  try {
    const update = await request.json().catch(() => null);
    if (!update || !update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat?.id;
    const rawText = (message.text || "").trim();

    if (!chatId || !rawText) {
      return NextResponse.json({ ok: true });
    }

    await initDbSchema();
    const sql = getDb();

    const lowerCmd = rawText.toLowerCase().split(" ")[0].split("@")[0];

    // ==============================================================
    // COMMAND 1: /help & /bantuan
    // ==============================================================
    if (lowerCmd === "/help" || lowerCmd === "/bantuan") {
      await sendTelegramMessage(
        chatId,
        `📖 <b>Pusat Bantuan ZailTrack Bot</b>\n\n` +
        `Bot ini mencatat transaksi keuangan secara instan & tersinkronisasi ke web dashboard.\n\n` +
        `<b>Daftar Perintah:</b>\n` +
        `• /saldo — Cek total pemasukan, pengeluaran & saldo bulan ini\n` +
        `• /terakhir — Lihat 5 catatan transaksi terakhir Anda\n` +
        `• /status — Cek status server web & latensi database\n` +
        `• /acc — Cek informasi akun & status keamanan\n` +
        `• /help — Tampilkan menu panduan ini\n\n` +
        `<b>Contoh Cara Catat Cepat:</b>\n` +
        `Cukup ketik pesan wajar tanpa garis miring:\n` +
        `• <code>keluar 50000 kopi kenangan</code>\n` +
        `• <code>beli bensin 35k</code>\n` +
        `• <code>masuk 1.5jt freelance</code>\n` +
        `• <code>+100000 dari bapak</code>\n` +
        `• <code>-25rb jajan</code>\n\n` +
        `🌐 <i>Dashboard web: https://zail-track.vercel.app/dashboard</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND 2: /status (Cek status kesehatan web & database)
    // ==============================================================
    if (lowerCmd === "/status") {
      const startPing = performance.now();
      await sql`SELECT 1 as ping`;
      const latency = Math.round(performance.now() - startPing);

      await sendTelegramMessage(
        chatId,
        `🟢 <b>Status Sistem ZailTrack</b>\n\n` +
        `• <b>Server Web:</b> Online (Vercel Edge Global)\n` +
        `• <b>Database:</b> Terhubung (Neon Serverless PostgreSQL)\n` +
        `• <b>Latensi Query:</b> ${latency} ms\n` +
        `• <b>Protokol:</b> HTTPS / TLS 1.3\n` +
        `• <b>Webhook:</b> Aktif & Realtime\n\n` +
        `Semua layanan beroperasi lancar dan siap digunakan.`
      );
      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND 3: /acc & /akun (Cek informasi akun pengguna)
    // ==============================================================
    if (lowerCmd === "/acc" || lowerCmd === "/akun") {
      const linked = await sql`
        SELECT id, username, role, created_at, telegram_chat_id 
        FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
      `;

      if (linked.length === 0) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Akun Telegram Anda belum terhubung ke ZailTrack.</b>\n\n` +
          `Silakan buka https://zail-track.vercel.app/dashboard lalu klik tombol <b>Telegram Bot</b> untuk menghubungkan akun.`
        );
        return NextResponse.json({ ok: true });
      }

      const u = linked[0];
      const joinedDate = new Date(u.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      await sendTelegramMessage(
        chatId,
        `👤 <b>Informasi Akun ZailTrack</b>\n\n` +
        `• <b>User ID:</b> #${u.id}\n` +
        `• <b>Username:</b> <code>${u.username}</code>\n` +
        `• <b>Role:</b> ${u.role === "admin" ? "ADMIN / DEV" : "USER"}\n` +
        `• <b>Chat ID:</b> <code>${chatId}</code>\n` +
        `• <b>Terdaftar Sejak:</b> ${joinedDate}\n` +
        `• <b>Password:</b> Terproteksi Enkripsi (Bcrypt Salt 10)\n\n` +
        `<i>Catatan Keamanan: Password Anda disimpan menggunakan enkripsi satu arah (hash) dan tidak dapat dilihat oleh siapapun. Jika Anda lupa password, Anda dapat me-reset akun melalui Mode Dev di dashboard web.</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND 4: /saldo (Cek kas & saldo bulan berjalan)
    // ==============================================================
    if (lowerCmd === "/saldo") {
      const linked = await sql`
        SELECT id, username FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
      `;

      if (linked.length === 0) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Akun Telegram belum terhubung ke ZailTrack.\nBuka https://zail-track.vercel.app/dashboard untuk menghubungkan.`
        );
        return NextResponse.json({ ok: true });
      }

      const userId = linked[0].id;
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
        WHERE user_id = ${userId}
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
        `🌐 <i>Rincian lengkap: https://zail-track.vercel.app/dashboard</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND 5: /terakhir & /riwayat (Lihat 5 transaksi terakhir)
    // ==============================================================
    if (lowerCmd === "/terakhir" || lowerCmd === "/riwayat") {
      const linked = await sql`
        SELECT id, username FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
      `;

      if (linked.length === 0) {
        await sendTelegramMessage(chatId, `⚠️ Akun Telegram belum terhubung.`);
        return NextResponse.json({ ok: true });
      }

      const userId = linked[0].id;
      const recentTx = await sql`
        SELECT id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_str
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY tanggal DESC, id DESC
        LIMIT 5
      `;

      if (recentTx.length === 0) {
        await sendTelegramMessage(
          chatId,
          `📋 <i>Belum ada riwayat transaksi yang dicatat.</i>\n\nKetik pesan baru, contoh: <code>keluar 50000 kopi kenangan</code>`
        );
        return NextResponse.json({ ok: true });
      }

      let textMsg = `📋 <b>5 Transaksi Terakhir Anda:</b>\n\n`;
      recentTx.forEach((tx, idx) => {
        const icon = tx.tipe === "income" ? "🟢" : "🔴";
        const sign = tx.tipe === "income" ? "+" : "-";
        textMsg += `${idx + 1}. ${icon} <b>${sign}${formatRupiah(Number(tx.jumlah))}</b> — ${tx.deskripsi} <i>(${tx.tanggal_str})</i>\n`;
      });
      textMsg += `\n🌐 <i>Dashboard: https://zail-track.vercel.app/dashboard</i>`;

      await sendTelegramMessage(chatId, textMsg);
      return NextResponse.json({ ok: true });
    }

    // ==============================================================
    // COMMAND 6: /start <link_code> (Otorisasi & Sambungkan Akun)
    // ==============================================================
    if (rawText.startsWith("/start")) {
      const parts = rawText.split(" ");
      const linkCode = parts[1]?.trim();

      if (linkCode) {
        // Cari user dengan link_code yang cocok
        const matchingUsers = await sql`
          SELECT id, username FROM users WHERE telegram_link_code = ${linkCode} LIMIT 1
        `;

        if (matchingUsers.length > 0) {
          const user = matchingUsers[0];
          // Hubungkan Chat ID Telegram ke akun ini
          await sql`
            UPDATE users 
            SET telegram_chat_id = ${chatId}, telegram_link_code = NULL 
            WHERE id = ${user.id}
          `;

          await sendTelegramMessage(
            chatId,
            `✅ <b>Berhasil Terhubung!</b>\n\n` +
            `Akun Telegram Anda sekarang terhubung ke ZailTrack sebagai <b>@${user.username}</b>.\n\n` +
            `Mulai sekarang Anda bisa langsung mencatat pengeluaran atau pemasukan kapan saja dari chat ini.\n\n` +
            `<b>Contoh Cara Catat:</b>\n` +
            `• <code>keluar 25000 kopi kenangan</code>\n` +
            `• <code>masuk 500k freelance</code>\n` +
            `• <code>beli bensin 35000</code>\n` +
            `• <code>-15000 parkir</code>\n` +
            `• <code>+1.5jt honor proyek</code>`
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Cek apakah chat ID ini sudah terhubung ke akun mana pun
      const currentLinked = await sql`
        SELECT username FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
      `;

      if (currentLinked.length > 0) {
        await sendTelegramMessage(
          chatId,
          `👋 Halo <b>@${currentLinked[0].username}</b>!\n\n` +
          `Akun Telegram Anda sudah aktif terhubung ke ZailTrack.\n\n` +
          `Ketik pesan transaksi Anda untuk langsung mencatat, contoh:\n` +
          `• <code>makan siang 35000</code>\n` +
          `• <code>keluar 25k jajan</code>\n` +
          `• <code>masuk 500000 bonus</code>\n\n` +
          `🌐 Buka web untuk melihat seluruh ringkasan & grafik:\n` +
          `https://zail-track.vercel.app/dashboard`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Akun Telegram Belum Terhubung</b>\n\n` +
          `Silakan hubungkan akun ZailTrack Anda terlebih dahulu:\n` +
          `1. Buka dashboard web: https://zail-track.vercel.app/dashboard\n` +
          `2. Klik tombol <b>Telegram Bot</b> di menu dashboard.\n` +
          `3. Klik tombol <b>Hubungkan ke Telegram</b> yang tersedia.`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Pencatatan Transaksi
    // Cari user yang memiliki telegram_chat_id ini
    const linkedUsers = await sql`
      SELECT id, username FROM users WHERE telegram_chat_id = ${chatId} LIMIT 1
    `;

    if (linkedUsers.length === 0) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Akun Telegram Anda belum terhubung ke ZailTrack.</b>\n\n` +
        `Silakan buka https://zail-track.vercel.app/dashboard, klik tombol <b>Telegram Bot</b>, lalu klik link tautan yang diberikan untuk menghubungkan.`
      );
      return NextResponse.json({ ok: true });
    }

    const user = linkedUsers[0];

    // Parse pesan transaksi
    const parsed = parseTransactionText(rawText);

    if (!parsed) {
      await sendTelegramMessage(
        chatId,
        `🤔 <i>Pesan tidak dikenali sebagai format transaksi.</i>\n\n` +
        `<b>Gunakan format mudah berikut:</b>\n` +
        `• <code>keluar 25000 kopi</code>\n` +
        `• <code>masuk 500000 bonus</code>\n` +
        `• <code>beli bensin 35k</code>\n` +
        `• <code>makan siang 45000</code>\n` +
        `• <code>+1jt honor</code> / <code>-20rb jajan</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // Ambil tanggal hari ini (Zona Waktu Indonesia WIB / UTC+7)
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const tanggalHariIni = nowWIB.toISOString().slice(0, 10); // YYYY-MM-DD
    const tanggalDisplay = tanggalHariIni.split("-").reverse().join("/"); // DD/MM/YYYY

    // Simpan langsung ke database Neon
    await sql`
      INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal)
      VALUES (${user.id}, ${parsed.tipe}, ${parsed.jumlah}, ${parsed.deskripsi}, ${tanggalHariIni})
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
      `👤 <b>Akun:</b> @${user.username}\n\n` +
      `🌐 <i>Data realtime sudah masuk ke web & Google Sheets!</i>\n` +
      `<a href="https://zail-track.vercel.app/dashboard">Buka Web Dashboard →</a>`
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
