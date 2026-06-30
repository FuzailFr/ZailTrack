<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$host = $_ENV['DB_HOST'] ?? 'localhost';
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASSWORD'] ?? '';
$dbName = $_ENV['DB_NAME'] ?? 'zailtrack_db';

try {
    $conn = mysqli_connect($host, $user, $pass);
    if (!$conn) {
        throw new Exception('Koneksi database gagal: ' . mysqli_connect_error());
    }

    mysqli_set_charset($conn, 'utf8mb4');

    $safeDbName = mysqli_real_escape_string($conn, $dbName);
    $createDbSql = "CREATE DATABASE IF NOT EXISTS `{$safeDbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci";
    if (!mysqli_query($conn, $createDbSql)) {
        throw new Exception('Gagal membuat database: ' . mysqli_error($conn));
    }

    if (!mysqli_select_db($conn, $dbName)) {
        throw new Exception('Gagal memilih database: ' . mysqli_error($conn));
    }

    $schema = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
        "CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            tipe ENUM('income','expense') NOT NULL,
            jumlah DECIMAL(15,2) NOT NULL,
            deskripsi TEXT NULL,
            tanggal DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_date (user_id, tanggal DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
    ];

    foreach ($schema as $sql) {
        if (!mysqli_query($conn, $sql)) {
            throw new Exception('Gagal menyiapkan skema database: ' . mysqli_error($conn));
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}
?>