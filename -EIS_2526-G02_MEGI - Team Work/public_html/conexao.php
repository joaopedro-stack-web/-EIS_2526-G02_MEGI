<?php
$host = 'localhost';
$db   = 'group_project'; // ou o nome que você usou ao importar o .sql
$user = 'root';
$pass = ''; // coloque a senha do MySQL se você tiver definido uma

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo "Erro de conexão: " . $e->getMessage();
    exit;
}
