<?php
require_once __DIR__ . '/configure.php';
header("Content-Type: application/json; charset=UTF-8");

function sendJson(array $payload): void {
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$action = $_GET['action'] ?? '';

if ($action === 'register') {
    $data = getJsonInput();
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if ($username === '' || $password === '') {
        sendJson(["status" => "error", "message" => "Data tidak boleh kosong."]);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = mysqli_prepare($conn, "INSERT INTO users (username, password) VALUES (?, ?)");
    if (!$stmt) {
        sendJson(["status" => "error", "message" => "Gagal menyiapkan query."]);
    }

    mysqli_stmt_bind_param($stmt, "ss", $username, $passwordHash);
    if (mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        sendJson(["status" => "success", "message" => "Registrasi berhasil!"]);
    }

    mysqli_stmt_close($stmt);
    sendJson(["status" => "error", "message" => "Username sudah terdaftar."]);
}

elseif ($action === 'login') {
    $data = getJsonInput();
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if ($username === '' || $password === '') {
        sendJson(["status" => "error", "message" => "Username atau password tidak boleh kosong."]);
    }

    $stmt = mysqli_prepare($conn, "SELECT id, username, password FROM users WHERE username = ? LIMIT 1");
    if (!$stmt) {
        sendJson(["status" => "error", "message" => "Gagal menyiapkan query."]);
    }

    mysqli_stmt_bind_param($stmt, "s", $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($user && password_verify($password, $user['password'])) {
        sendJson(["status" => "success", "user_id" => (int)$user['id'], "username" => $user['username']]);
    }

    sendJson(["status" => "error", "message" => "Username atau password salah."]);
}

elseif ($action === 'get_dashboard') {
    $user_id = (int)($_GET['user_id'] ?? 0);
    if ($user_id <= 0) {
        sendJson(["status" => "unauthorized"]);
    }

    $bulan = date('m');
    $tahun = date('Y');

    $stmt = mysqli_prepare($conn, "SELECT IFNULL(SUM(jumlah), 0) AS total FROM transactions WHERE user_id = ? AND tipe = 'income' AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?");
    mysqli_stmt_bind_param($stmt, "iii", $user_id, $bulan, $tahun);
    mysqli_stmt_execute($stmt);
    $incomeResult = mysqli_stmt_get_result($stmt);
    $incomeRow = mysqli_fetch_assoc($incomeResult);
    mysqli_stmt_close($stmt);

    $stmt = mysqli_prepare($conn, "SELECT IFNULL(SUM(jumlah), 0) AS total FROM transactions WHERE user_id = ? AND tipe = 'expense' AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?");
    mysqli_stmt_bind_param($stmt, "iii", $user_id, $bulan, $tahun);
    mysqli_stmt_execute($stmt);
    $expenseResult = mysqli_stmt_get_result($stmt);
    $expenseRow = mysqli_fetch_assoc($expenseResult);
    mysqli_stmt_close($stmt);

    $total_income = (float)($incomeRow['total'] ?? 0);
    $total_expense = (float)($expenseRow['total'] ?? 0);
    $saldo = $total_income - $total_expense;

    $stmt = mysqli_prepare($conn, "SELECT * FROM transactions WHERE user_id = ? ORDER BY tanggal DESC, id DESC");
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    $trxResult = mysqli_stmt_get_result($stmt);

    $transactions = [];
    while ($row = mysqli_fetch_assoc($trxResult)) {
        $transactions[] = $row;
    }
    mysqli_stmt_close($stmt);

    sendJson([
        "status" => "success",
        "summary" => ["income" => $total_income, "expense" => $total_expense, "saldo" => $saldo],
        "transactions" => $transactions
    ]);
}

elseif ($action === 'simpan') {
    $data = getJsonInput();
    $user_id = (int)($data['user_id'] ?? 0);
    $tipe = strtolower(trim($data['tipe'] ?? ''));
    $jumlah = (float)($data['jumlah'] ?? 0);
    $deskripsi = trim($data['deskripsi'] ?? '');
    $tanggal = trim($data['tanggal'] ?? '');

    if ($user_id <= 0 || !in_array($tipe, ['income', 'expense'], true) || $jumlah <= 0 || $tanggal === '') {
        sendJson(["status" => "error", "message" => "Data transaksi tidak valid."]);
    }

    $stmt = mysqli_prepare($conn, "INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        sendJson(["status" => "error", "message" => "Gagal menyiapkan query."]);
    }

    mysqli_stmt_bind_param($stmt, "isdss", $user_id, $tipe, $jumlah, $deskripsi, $tanggal);
    if (mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        sendJson(["status" => "success", "message" => "Transaksi tersimpan."]);
    }

    mysqli_stmt_close($stmt);
    sendJson(["status" => "error", "message" => "Gagal menyimpan transaksi."]);
}

elseif ($action === 'export') {
    $user_id = (int)($_GET['user_id'] ?? 0);
    if ($user_id <= 0) {
        http_response_code(400);
        echo 'Unauthorized';
        exit;
    }

    header("Content-Type: application/vnd.ms-excel; charset=utf-8");
    header("Content-Disposition: attachment; filename=Laporan_ZailTrack.xls");

    $stmt = mysqli_prepare($conn, "SELECT * FROM transactions WHERE user_id = ? ORDER BY tanggal ASC, id ASC");
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    $data = mysqli_stmt_get_result($stmt);

    echo "<table border='1'>
            <tr style='background:#111;color:white;'><th>Tanggal</th><th>Tipe</th><th>Jumlah (Rp)</th><th>Deskripsi</th></tr>";
    while ($row = mysqli_fetch_assoc($data)) {
        $t_txt = $row['tipe'] === 'income' ? 'Pemasukan' : 'Pengeluaran';
        echo "<tr>
                <td>{$row['tanggal']}</td>
                <td>{$t_txt}</td>
                <td style=\"mso-number-format:'\\#\\,\\#\\#0'; text-align:right;\" x:num='{$row['jumlah']}'>{$row['jumlah']}</td>
                <td>" . htmlspecialchars($row['deskripsi']) . "</td>
              </tr>";
    }
    echo "</table>";
}

else {
    sendJson(["status" => "error", "message" => "Aksi tidak valid."]);
}
?>