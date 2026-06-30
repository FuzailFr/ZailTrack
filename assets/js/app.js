const API_URL = "/api";

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
        alert("Username dan password wajib diisi.");
        return;
    }

    const { data } = await requestJson(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    alert(data.message || "Registrasi selesai.");
    if (data.status === "success") {
        window.location.href = "/index";
    }
}

async function authLogin(e) {
    e.preventDefault();
    const username = document.getElementById("logUser")?.value.trim();
    const password = document.getElementById("logPass")?.value.trim();

    if (!username || !password) {
        alert("Username dan password wajib diisi.");
        return;
    }

    const { data } = await requestJson(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (data.status === "success") {
        localStorage.setItem("user_id", String(data.user_id));
        localStorage.setItem("username", data.username);
        window.location.href = "/dashboard";
    } else {
        alert(data.message || "Login gagal.");
    }
}

async function loadDashboardData() {
    const user_id = localStorage.getItem("user_id");
    if (!user_id) {
        window.location.href = "/index";
        return;
    }

    const welcome = document.getElementById("welcomeTxt");
    if (welcome) {
        welcome.innerText = "⚡ " + (localStorage.getItem("username") || "Dashboard");
    }

    const { data } = await requestJson(`${API_URL}/get_dashboard?user_id=${user_id}`);
    if (data.status === "success") {
        document.getElementById("sumIncome").innerText = "Rp " + Number(data.summary?.income || 0).toLocaleString("id-ID");
        document.getElementById("sumExpense").innerText = "Rp " + Number(data.summary?.expense || 0).toLocaleString("id-ID");
        document.getElementById("sumSaldo").innerText = "Rp " + Number(data.summary?.saldo || 0).toLocaleString("id-ID");

        let rows = "";
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
            data.transactions.forEach((t) => {
                rows += `<tr>
                    <td>${t.tanggal || "-"}</td>
                    <td><span class="badge ${t.tipe === "income" ? "bg-success text-dark" : "bg-danger"}">${t.tipe === "income" ? "Masuk" : "Keluar"}</span></td>
                    <td class="fw-bold text-white">Rp ${Number(t.jumlah || 0).toLocaleString("id-ID")}</td>
                    <td>${t.deskripsi || "-"}</td>
                </tr>`;
            });
        } else {
            rows = `<tr><td colspan="4" class="text-center text-muted py-3">Belum ada transaksi</td></tr>`;
        }

        document.getElementById("trxTable").innerHTML = rows;
    }
}

async function simpanTransaksi(e) {
    e.preventDefault();
    const user_id = localStorage.getItem("user_id");
    const tipe = document.getElementById("txTipe")?.value;
    const jumlah = document.getElementById("txJumlah")?.value;
    const tanggal = document.getElementById("txTanggal")?.value;
    const deskripsi = document.getElementById("txDeskripsi")?.value;

    const { data } = await requestJson(`${API_URL}/simpan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, tipe, jumlah, tanggal, deskripsi })
    });

    if (data.status === "success") {
        document.getElementById("trxForm").reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById("addModal"));
        if (modal) modal.hide();
        await loadDashboardData();
    } else {
        alert(data.message || "Gagal menyimpan data.");
    }
}

function downloadExcel() {
    const user_id = localStorage.getItem("user_id");
    window.location.href = `${API_URL}/export?user_id=${user_id}`;
}

function logout() {
    localStorage.clear();
    window.location.href = "/index";
}