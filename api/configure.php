<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = $_ENV['DB_HOST'] ?? 'localhost';
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASSWORD'] ?? '';
$db   = $_ENV['DB_NAME'] ?? 'finance_app';

$conn = mysqli_connect($host, $user, $pass);
if (!$conn) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Koneksi database gagal."]);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');
mysqli_query($conn, "CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
mysqli_select_db($conn, $db);

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;");

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tipe ENUM('income','expense') NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    deskripsi TEXT NULL,
    tanggal DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;");
?>