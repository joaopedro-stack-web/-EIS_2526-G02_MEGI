<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php'; // fornece $pdo

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    json_out(['success' => false, 'error' => 'User not authenticated'], 401);
}

try {
    // TOTAL COLLECTIONS
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM collection WHERE user_id = ?"
    );
    $stmt->execute([$userId]);
    $totalCollections = (int)$stmt->fetchColumn();

    // TOTAL ITEMS
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM item i
        INNER JOIN collection c
          ON c.collection_id = i.collection_id
        WHERE c.user_id = ?
    ");
    $stmt->execute([$userId]);
    $totalItems = (int)$stmt->fetchColumn();

    // AVERAGE RATING / IMPORTANCE
    $stmt = $pdo->prepare("
        SELECT AVG(COALESCE(i.rating, i.importance))
        FROM item i
        INNER JOIN collection c
          ON c.collection_id = i.collection_id
        WHERE c.user_id = ?
    ");
    $stmt->execute([$userId]);
    $avg = $stmt->fetchColumn();

    json_out([
        'success' => true,
        'metrics' => [
            'total_collections' => $totalCollections,
            'total_items' => $totalItems,
            'average_rating' => $avg !== null ? round((float)$avg, 2) : 0
        ]
    ]);

} catch (Throwable $e) {
    json_out([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}
