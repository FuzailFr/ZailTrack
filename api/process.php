<?php
include 'configure.php';

global $conn;

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// --- 1. PROSES REGISTER ---
if ($action === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = mysqli_real_escape_string($conn, $data['username']);
    $password = password_hash($data['password'], PASSWORD_BCRYPT);

    $query = "INSERT INTO users (username, password) VALUES ('$username', '$password')";
    if (mysqli_query($conn, $query)) {
        echo json_encode(["status" => "success", "message" => "Registrasi berhasil! Silakan masuk."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Username sudah digunakan."]);
    }
}

// --- 2. PROSES LOGIN ---
elseif ($action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = mysqli_real_escape_string($conn, $data['username']);
    $password = $data['password'];

    $result = mysqli_query($conn, "SELECT * FROM users WHERE username='$username'");
    if (mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(["status" => "success", "user_id" => $user['id'], "username" => $user['username']]);
            exit;
        }
    }
    echo json_encode(["status" => "error", "message" => "Username atau password salah."]);
}

// --- 3. AMBIL DATA DASHBOARD ---
elseif ($action === 'get_dashboard') {
    $user_id = $_GET['user_id'] ?? null;
    if (!$user_id) { echo json_encode(["status" => "unauthorized"]); exit; }

    $bulan = $_GET['bulan'] ?? date('m');
    $tahun = $_GET['tahun'] ?? date('Y');

    $inc_q = mysqli_fetch_assoc(mysqli_query($conn, "SELECT IFNULL(SUM(jumlah),0) AS total FROM transactions WHERE user_id='$user_id' AND tipe='income' AND MONTH(tanggal)='$bulan' AND YEAR(tanggal)='$tahun'"));
    $exp_q = mysqli_fetch_assoc(mysqli_query($conn, "SELECT IFNULL(SUM(jumlah),0) AS total FROM transactions WHERE user_id='$user_id' AND tipe='expense' AND MONTH(tanggal)='$bulan' AND YEAR(tanggal)='$tahun'"));
    
    $total_income = (float)$inc_q['total'];
    $total_expense = (float)$exp_q['total'];
    $saldo = $total_income - $total_expense;

    $trx_q = mysqli_query($conn, "SELECT * FROM transactions WHERE user_id='$user_id' AND MONTH(tanggal)='$bulan' AND YEAR(tanggal)='$tahun' ORDER BY tanggal DESC");
    $transactions = [];
    while($r = mysqli_fetch_assoc($trx_q)) { $transactions[] = $r; }

    echo json_encode([
        "status" => "success",
        "summary" => ["income" => $total_income, "expense" => $total_expense, "saldo" => $saldo],
        "transactions" => $transactions
    ]);
}

// --- 4. SIMPAN TRANSAKSI ---
elseif ($action === 'simpan') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = (int)$data['user_id'];
    $tipe = mysqli_real_escape_string($conn, $data['tipe']);
    $jumlah = (float)$data['jumlah'];
    $deskripsi = mysqli_real_escape_string($conn, $data['deskripsi']);
    $tanggal = mysqli_real_escape_string($conn, $data['tanggal']);

    $query = "INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal) VALUES ('$user_id', '$tipe', '$jumlah', '$deskripsi', '$tanggal')";
    echo json_encode(["status" => mysqli_query($conn, $query) ? "success" : "error"]);
}

// --- 5. EXPORT DATA EXCEL ---
elseif ($action === 'export') {
    $user_id = $_GET['user_id'] ?? null;
    $bulan = $_GET['bulan'] ?? date('m');
    $tahun = $_GET['tahun'] ?? date('Y');

    header("Content-Type: application/vnd-ms-excel");
    header("Content-Disposition: attachment; filename=Laporan_ZailTrack_" . $bulan . "_" . $tahun . ".xls");
    
    $query = "SELECT * FROM transactions WHERE user_id='$user_id' AND MONTH(tanggal)='$bulan' AND YEAR(tanggal)='$tahun' ORDER BY tanggal ASC";
    $data = mysqli_query($conn, $query);
    
    // Tampilkan data ke struktur table Excel HTML seperti kode export kita sebelumnya
    echo "<table border='1'>
            <tr style='background:#212529;color:white;'><th>Tanggal</th><th>Tipe</th><th>Jumlah</th><th>Deskripsi</th></tr>";
    while($row = mysqli_fetch_assoc($data)) {
        $tipe_text = $row['tipe'] == 'income' ? 'Pemasukan' : 'Pengeluaran';
        echo "<tr>
                <td>{$row['tanggal']}</td>
                <td>{$tipe_text}</td>
                <td style=\"mso-number-format:'\#\,\#\#0'; text-align:right;\" x:num='{$row['jumlah']}'>{$row['jumlah']}</td>
                <td>".htmlspecialchars($row['deskripsi'])."</td>
              </tr>";
    }
    echo "</table>";
}
?>