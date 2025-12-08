<?php
header('Content-Type: application/json; charset=utf-8');

require 'conexao.php';
require 'EventDAL.php';

$eventDal = new EventDAL($pdo);

// =====================================================
// ==================== POST ============================
// =====================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // === DELETE EVENT ===
    if (isset($_POST['action']) && $_POST['action'] === 'delete') {

        if (!isset($_POST['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing event ID']);
            exit;
        }

        $id = (int)$_POST['id'];

        try {
            $eventDal->deleteEvent($id);
            echo json_encode(['success' => true]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }

    // === UPDATE EVENT ===
    if (isset($_POST['action']) && $_POST['action'] === 'update') {

        $id          = (int)($_POST['id'] ?? 0);
        $collection  = (int)($_POST['collection'] ?? 0);
        $name        = trim($_POST['name'] ?? '');
        $location    = trim($_POST['location'] ?? '');
        $date        = trim($_POST['date'] ?? '');
        $description = trim($_POST['description'] ?? '');

        if (!$id || !$collection || !$name || !$location || !$date || !$description) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing required fields for update']);
            exit;
        }

        try {
            $eventDal->updateEvent(
                $id,
                $collection,
                $name,
                $location,
                $date,
                $description
            );

            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }

    // === CREATE EVENT ===
    $collection  = (int)($_POST['collection'] ?? 0);
    $name        = trim($_POST['name'] ?? '');
    $location    = trim($_POST['location'] ?? '');
    $date        = trim($_POST['date'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if (!$collection || !$name || !$location || !$date || !$description) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    $imagePath = null;

    // Upload opcional de imagem
    if (!empty($_FILES['image']['name'])) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = time() . '_' . basename($_FILES['image']['name']);
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            $imagePath = $targetPath;
        }
    }

    try {
        $newId = $eventDal->createEvent(
            $collection,
            $name,
            $location,
            $date,
            $description,
            $imagePath
        );

        echo json_encode([
            'success' => true,
            'id'      => $newId
        ]);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// =====================================================
// ==================== GET =============================
// =====================================================

try {
    $events = $eventDal->getAllEvents();

    // ✅ FILTRO REAL POR COLEÇÃO VIA ?c=ID
    if (isset($_GET['c']) && $_GET['c'] !== '') {
        $cid = (int)$_GET['c'];
        $events = array_values(array_filter($events, function ($e) use ($cid) {
            return (int)$e['collection_id'] === $cid;
        }));
    }

    echo json_encode([
        'success' => true,
        'events'  => $events
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
    exit;
}
