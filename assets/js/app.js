const API_URL = "/api/process.php";

function alertMessage(message) {
    window.alert(message);
}

function redirectTo(path) {
    window.location.href = path;
}

function getStoredUser() {
    return {
        user_id: localStorage.getItem("user_id") || "",
        username: localStorage.getItem("username") || ""
    };
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        headers: { Accept: "application/json", ...(options.headers || {}) },
        ...options
    });

    const data = await response.json().catch(() => ({ status: "error", message: "Respons tidak valid." }));
    if (!response.ok && !data.status) {
        data.status = "error";
        data.message = data.message || "Permintaan gagal.";
    }
    return { response, data };
}

async function authRegister(e) {
    e.preventDefault();
    const username = document.getElementById("regUser")?.value.trim();
    const password = document.getElementById("regPass")?.value.trim();

    if (!username || !password) {
        alertMessage("Username dan password wajib diisi.");
        return;
    }

    const { data } = await requestJson(`${API_URL}?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    alertMessage(data.message || "Registrasi selesai.");
    if (data.status === "success") {
        redirectTo("./index.html");
    }
}

async function authLogin(e) {
    e.preventDefault();
    const username = document.getElementById("logUser")?.value.trim();
    const password = document.getElementById("logPass")?.value.trim();

    if (!username || !password) {
        alertMessage("Username dan password wajib diisi.");
        return;
    }

    const { data } = await requestJson(`${API_URL}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (data.status === "success") {
        localStorage.setItem("user_id", String(data.user_id));
        localStorage.setItem("username", data.username);
        redirectTo("./dashboard.html");
    } else {
        alertMessage(data.message || "Login gagal.");
    }
}

async function loadDashboardData() {
    const { user_id, username } = getStoredUser();
    if (!user_id) {
        redirectTo("./index.html");
        return;
    }

    const welcome = document.getElementById("welcomeTxt");
    if (welcome) {
        welcome.innerText = `⚡ Selamat datang, ${username || "Pengguna"}`;
    }

    const { data } = await requestJson(`${API_URL}?action=get_dashboard&user_id=${user_id}`);
    if (data.status !== "success") {
        alertMessage(data.message || "Gagal memuat data dashboard.");
        return;
    }

    const incomeEl = document.getElementById("sumIncome");
    const expenseEl = document.getElementById("sumExpense");
    const saldoEl = document.getElementById("sumSaldo");

    if (incomeEl) incomeEl.innerText = "Rp " + Number(data.summary?.income || 0).toLocaleString("id-ID");
    if (expenseEl) expenseEl.innerText = "Rp " + Number(data.summary?.expense || 0).toLocaleString("id-ID");
    if (saldoEl) saldoEl.innerText = "Rp " + Number(data.summary?.saldo || 0).toLocaleString("id-ID");

    const tableBody = document.getElementById("trxTable");
    if (!tableBody) {
        return;
    }

    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        tableBody.innerHTML = data.transactions.map((t) => `
            <tr>
                <td>${t.tanggal || "-"}</td>
                <td><span class="badge ${t.tipe === "income" ? "bg-success text-dark" : "bg-danger"}">${t.tipe === "income" ? "Masuk" : "Keluar"}</span></td>
                <td class="fw-bold text-white">Rp ${Number(t.jumlah || 0).toLocaleString("id-ID")}</td>
                <td>${t.deskripsi ? t.deskripsi : "-"}</td>
            </tr>
        `).join("");
    } else {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Belum ada transaksi</td></tr>`;
    }
}

async function simpanTransaksi(e) {
    e.preventDefault();
    const { user_id } = getStoredUser();
    const tipe = document.getElementById("txTipe")?.value;
    const jumlah = document.getElementById("txJumlah")?.value;
    const tanggal = document.getElementById("txTanggal")?.value;
    const deskripsi = document.getElementById("txDeskripsi")?.value;

    if (!user_id || !tipe || !jumlah || !tanggal) {
        alertMessage("Lengkapi semua data transaksi terlebih dahulu.");
        return;
    }

    const { data } = await requestJson(`${API_URL}?action=simpan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, tipe, jumlah, tanggal, deskripsi })
    });

    if (data.status === "success") {
        document.getElementById("trxForm")?.reset();
        const modal = window.bootstrap?.Modal?.getInstance(document.getElementById("addModal"));
        if (modal) modal.hide();
        await loadDashboardData();
    } else {
        alertMessage(data.message || "Gagal menyimpan data.");
    }
}

function downloadExcel() {
    const { user_id } = getStoredUser();
    if (!user_id) {
        redirectTo("./index.html");
        return;
    }
    window.location.href = `${API_URL}?action=export&user_id=${user_id}`;
}

function logout() {
    localStorage.clear();
    redirectTo("./index.html");
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("regForm");
    const trxForm = document.getElementById("trxForm");

    if (loginForm) loginForm.addEventListener("submit", authLogin);
    if (regForm) regForm.addEventListener("submit", authRegister);
    if (trxForm) trxForm.addEventListener("submit", simpanTransaksi);

    if (document.getElementById("loginArea") && getStoredUser().user_id) {
        redirectTo("./dashboard.html");
    }
});

window.authLogin = authLogin;
window.authRegister = authRegister;
window.logout = logout;
window.downloadExcel = downloadExcel;
window.loadDashboardData = loadDashboardData;
window.simpanTransaksi = simpanTransaksi;