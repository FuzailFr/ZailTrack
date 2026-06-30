const API_URL = window.location.origin + "/api";

async function authRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    alert(data.message);
    if(data.status === 'success') window.location.reload();
}

async function authLogin(e) {
    e.preventDefault();
    const username = document.getElementById('logUser').value;
    const password = document.getElementById('logPass').value;
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.status === 'success') {
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username);
        window.location.href = "dashboard";
    } else { alert(data.message); }
}

async function loadDashboardData() {
    const user_id = localStorage.getItem("user_id");
    if (!user_id) { window.location.href = "index"; return; }
    document.getElementById('welcomeTxt').innerText = "🖤 " + localStorage.getItem("username");

    const res = await fetch(`${API_URL}/get_dashboard?user_id=${user_id}`);
    const data = await res.json();
    if(data.status === 'success') {
        document.getElementById('sumIncome').innerText = "Rp " + data.summary.income.toLocaleString('id-ID');
        document.getElementById('sumExpense').innerText = "Rp " + data.summary.expense.toLocaleString('id-ID');
        document.getElementById('sumSaldo').innerText = "Rp " + data.summary.saldo.toLocaleString('id-ID');
        let rows = "";
        if(data.transactions.length > 0) {
            data.transactions.forEach(t => {
                rows += `<tr>
                    <td>${t.tanggal}</td>
                    <td><span class="badge ${t.tipe === 'income' ? 'bg-success text-dark' : 'bg-danger'}">${t.tipe === 'income' ? 'Masuk' : 'Keluar'}</span></td>
                    <td class="fw-bold">Rp ${parseFloat(t.jumlah).toLocaleString('id-ID')}</td>
                    <td>${t.deskripsi}</td>
                </tr>`;
            });
        } else { rows = `<tr><td colspan="4" class="text-center text-muted">Belum ada transaksi</td></tr>`; }
        document.getElementById('trxTable').innerHTML = rows;
    }
}

async function simpanTransaksi(e) {
    e.preventDefault();
    const user_id = localStorage.getItem("user_id");
    const tipe = document.getElementById('txTipe').value;
    const jumlah = document.getElementById('txJumlah').value;
    const tanggal = document.getElementById('txTanggal').value;
    const deskripsi = document.getElementById('txDeskripsi').value;

    await fetch(`${API_URL}/simpan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, tipe, jumlah, tanggal, deskripsi })
    });
    window.location.reload();
}

function downloadExcel() {
    const user_id = localStorage.getItem("user_id");
    window.location.href = `${API_URL}/export?user_id=${user_id}`;
}

function logout() { localStorage.clear(); window.location.href = "index"; }