<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZailTrack - Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>

<nav class="navbar navbar-dark mb-4 py-3" style="background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color);">
    <div class="container px-3">
        <span class="navbar-brand h1 fw-bold mb-0">🖤 ZailTrack</span>
        <button onclick="logout()" class="btn btn-sm btn-outline-light">Keluar</button>
    </div>
</nav>

<div class="container px-3 fade-in">
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 id="welcomeTxt" class="fw-bold m-0">Halo, User</h4>
        <div class="d-flex gap-2">
            <button onclick="downloadExcel()" class="btn btn-outline-success btn-sm px-3">📊 Excel</button>
            <button class="btn btn-premium btn-sm px-3" data-bs-toggle="modal" data-bs-target="#addModal">+ Transaksi</button>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-4"><div class="card card-custom p-3"><small class="text-muted d-block mb-1">Masuk</small><b id="sumIncome" class="text-success">Rp 0</b></div></div>
        <div class="col-4"><div class="card card-custom p-3"><small class="text-muted d-block mb-1">Keluar</small><b id="sumExpense" class="text-danger">Rp 0</b></div></div>
        <div class="col-4"><div class="card card-custom p-3"><small class="text-muted d-block mb-1">Saldo</small><b id="sumSaldo">Rp 0</b></div></div>
    </div>

    <div class="card card-custom p-3">
        <div class="table-responsive">
            <table class="table table-dark table-striped align-middle mb-0 text-nowrap">
                <thead><tr><th>Tanggal</th><th>Tipe</th><th>Jumlah</th><th>Deskripsi</th></tr></thead>
                <tbody id="trxTable">
                    <tr><td colspan="4" class="text-center text-muted py-3">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal fade" id="addModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width: 360px;">
    <div class="modal-content card-custom p-2 text-white">
      <div class="modal-body">
        <h5 class="fw-bold mb-3">Tambah Catatan</h5>
        <form id="trxForm">
            <div class="mb-2">
                <label class="small text-muted mb-1">Tipe</label>
                <select id="txTipe" class="form-select form-select-sm"><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select>
            </div>
            <div class="mb-2"><label class="small text-muted mb-1">Jumlah</label><input type="number" id="txJumlah" class="form-control form-control-sm" required></div>
            <div class="mb-2"><label class="small text-muted mb-1">Tanggal</label><input type="date" id="txTanggal" class="form-control form-control-sm" required></div>
            <div class="mb-3"><label class="small text-muted mb-1">Deskripsi</label><input type="text" id="txDeskripsi" class="form-control form-control-sm"></div>
            <button type="submit" class="btn btn-premium btn-sm w-100 py-2">Simpan Catatan</button>
        </form>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
<script>
    document.addEventListener("DOMContentLoaded", loadDashboardData);
    document.getElementById('trxForm').addEventListener('submit', simpanTransaksi);
</script>
</body>
</html>