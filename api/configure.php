<?php
session_start();

$host = $_ENV['DB_HOST'] ?? "localhost";
$user = $_ENV['DB_USER'] ?? "root";
$pass = $_ENV['DB_PASSWORD'] ?? "";
$db   = $_ENV['DB_NAME'] ?? "finance_app";

// 1. Koneksi awal ke server MySQL
$conn = mysqli_connect($host, $user, $pass);
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Gagal koneksi ke server database"]));
}

// 2. Otomatis buat database jika belum ada
mysqli_query($conn, "CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
mysqli_select_db($conn, $db);

// 3. Otomatis buat tabel Users
mysqli_query($conn, "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;");

// 4. Otomatis buat tabel Transactions
mysqli_query($conn, "CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL DEFAULT 1,
    tipe ENUM('income','expense') NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    deskripsi TEXT NULL,
    tanggal DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;");
?>