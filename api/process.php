<?php
require_once __DIR__ . '/configure.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function sendJson(array $payload, int $statusCode = 200): void {
    http_response_code($statusCode);
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
    $username = trim((string)($data['username'] ?? ''));
    $password = trim((string)($data['password'] ?? ''));

    if ($username === '' || $password === '') {
        sendJson(['status' => 'error', 'message' => 'Username dan password wajib diisi.']);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = mysqli_prepare($conn, 'INSERT INTO users (username, password) VALUES (?, ?)');
    if (!$stmt) {
        sendJson(['status' => 'error', 'message' => 'Gagal menyiapkan query registrasi.']);
    }

    mysqli_stmt_bind_param($stmt, 'ss', $username, $passwordHash);
    if (mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        sendJson(['status' => 'success', 'message' => 'Registrasi berhasil.']);
    }

    mysqli_stmt_close($stmt);
    sendJson(['status' => 'error', 'message' => 'Username sudah terdaftar.']);
} elseif ($action === 'login') {
    $data = getJsonInput();
    $username = trim((string)($data['username'] ?? ''));
    $password = trim((string)($data['password'] ?? ''));

    if ($username === '' || $password === '') {
        sendJson(['status' => 'error', 'message' => 'Username atau password tidak boleh kosong.']);
    }

    $stmt = mysqli_prepare($conn, 'SELECT id, username, password FROM users WHERE username = ? LIMIT 1');
    if (!$stmt) {
        sendJson(['status' => 'error', 'message' => 'Gagal menyiapkan query login.']);
    }

    mysqli_stmt_bind_param($stmt, 's', $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($user && password_verify($password, $user['password'])) {
        sendJson(['status' => 'success', 'user_id' => (int)$user['id'], 'username' => $user['username']]);
    }

    sendJson(['status' => 'error', 'message' => 'Username atau password salah.']);
} elseif ($action === 'get_dashboard') {
    $userId = (int)($_GET['user_id'] ?? 0);
    if ($userId <= 0) {
        sendJson(['status' => 'unauthorized', 'message' => 'Silakan login kembali.'], 401);
    }

    $month = (int)date('m');
    $year = (int)date('Y');

    $incomeStmt = mysqli_prepare($conn, 'SELECT IFNULL(SUM(jumlah), 0) AS total FROM transactions WHERE user_id = ? AND tipe = "income" AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?');
    mysqli_stmt_bind_param($incomeStmt, 'iii', $userId, $month, $year);
    mysqli_stmt_execute($incomeStmt);
    $incomeResult = mysqli_stmt_get_result($incomeStmt);
    $incomeRow = mysqli_fetch_assoc($incomeResult);
    mysqli_stmt_close($incomeStmt);

    $expenseStmt = mysqli_prepare($conn, 'SELECT IFNULL(SUM(jumlah), 0) AS total FROM transactions WHERE user_id = ? AND tipe = "expense" AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?');
    mysqli_stmt_bind_param($expenseStmt, 'iii', $userId, $month, $year);
    mysqli_stmt_execute($expenseStmt);
    $expenseResult = mysqli_stmt_get_result($expenseStmt);
    $expenseRow = mysqli_fetch_assoc($expenseResult);
    mysqli_stmt_close($expenseStmt);

    $totalIncome = (float)($incomeRow['total'] ?? 0);
    $totalExpense = (float)($expenseRow['total'] ?? 0);
    $saldo = $totalIncome - $totalExpense;

    $trxStmt = mysqli_prepare($conn, 'SELECT * FROM transactions WHERE user_id = ? ORDER BY tanggal DESC, id DESC');
    mysqli_stmt_bind_param($trxStmt, 'i', $userId);
    mysqli_stmt_execute($trxStmt);
    $trxResult = mysqli_stmt_get_result($trxStmt);

    $transactions = [];
    while ($row = mysqli_fetch_assoc($trxResult)) {
        $transactions[] = $row;
    }
    mysqli_stmt_close($trxStmt);

    sendJson([
        'status' => 'success',
        'summary' => ['income' => $totalIncome, 'expense' => $totalExpense, 'saldo' => $saldo],
        'transactions' => $transactions
    ]);
} elseif ($action === 'simpan') {
    $data = getJsonInput();
    $userId = (int)($data['user_id'] ?? 0);
    $tipe = strtolower(trim((string)($data['tipe'] ?? '')));
    $jumlah = (float)($data['jumlah'] ?? 0);
    $deskripsi = trim((string)($data['deskripsi'] ?? ''));
    $tanggal = trim((string)($data['tanggal'] ?? ''));

    if ($userId <= 0 || !in_array($tipe, ['income', 'expense'], true) || $jumlah <= 0 || $tanggal === '') {
        sendJson(['status' => 'error', 'message' => 'Data transaksi tidak valid.']);
    }

    $stmt = mysqli_prepare($conn, 'INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal) VALUES (?, ?, ?, ?, ?)');
    if (!$stmt) {
        sendJson(['status' => 'error', 'message' => 'Gagal menyiapkan query transaksi.']);
    }

    mysqli_stmt_bind_param($stmt, 'isdss', $userId, $tipe, $jumlah, $deskripsi, $tanggal);
    if (mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        sendJson(['status' => 'success', 'message' => 'Transaksi tersimpan.']);
    }

    mysqli_stmt_close($stmt);
    sendJson(['status' => 'error', 'message' => 'Gagal menyimpan transaksi.']);
} elseif ($action === 'export') {
    $userId = (int)($_GET['user_id'] ?? 0);
    if ($userId <= 0) {
        sendJson(['status' => 'error', 'message' => 'Unauthorized'], 401);
    }

    header('Content-Type: application/vnd.ms-excel; charset=utf-8');
    header('Content-Disposition: attachment; filename=Laporan_ZailTrack.xls');

    $stmt = mysqli_prepare($conn, 'SELECT * FROM transactions WHERE user_id = ? ORDER BY tanggal ASC, id ASC');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    echo "<table border='1'>
        <tr style='background:#111;color:white;'><th>Tanggal</th><th>Tipe</th><th>Jumlah (Rp)</th><th>Deskripsi</th></tr>";
    while ($row = mysqli_fetch_assoc($result)) {
        $typeLabel = $row['tipe'] === 'income' ? 'Pemasukan' : 'Pengeluaran';
        echo "<tr>
            <td>{$row['tanggal']}</td>
            <td>{$typeLabel}</td>
            <td style=\"mso-number-format:'\\#\\,\\#\\#0'; text-align:right;\" x:num='{$row['jumlah']}'>{$row['jumlah']}</td>
            <td>" . htmlspecialchars($row['deskripsi']) . "</td>
        </tr>";
    }
    echo '</table>';
    exit;
} else {
    sendJson(['status' => 'error', 'message' => 'Aksi tidak valid.'], 400);
}
?>