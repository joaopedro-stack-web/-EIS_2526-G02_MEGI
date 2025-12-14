<?php
declare(strict_types=1);

$host = "localhost";
$db   = "group_project";
$user = "root";
$pass = "";

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // NÃO usar die() aqui, porque APIs precisam devolver JSON corretamente.
    // A exceção vai ser capturada no arquivo API (items_api.php, collection_api.php, etc.)
    throw $e;
}
