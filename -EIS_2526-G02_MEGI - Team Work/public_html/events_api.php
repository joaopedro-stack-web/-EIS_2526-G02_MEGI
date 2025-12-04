<?php
header('Content-Type: application/json; charset=utf-8');

// 1. Inkludera anslutningen (ger oss $pdo)
require 'conexao.php';

// 2. Inkludera det nya DAL-lagret
require 'EventDAL.php';

// 3. Initiera DAL-klassen
$eventDal = new EventDAL($pdo);


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // === DELETE EVENT (Använder DAL) ===
    if (isset($_POST['action']) && $_POST['action'] === 'delete') {

        $id = $_POST['id'] ?? null;
        if ($id === null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing event ID']);
            exit;
        }

        // Här skulle du lägga in din BEHÖRIGHETSKONTROLL (Kritiskt för Sprint 2)
        // if (!hasPermissionToEditEvent($id, $currentUser)) { ... }

        try {
            // ANROP TILL DAL
            $eventDal->deleteEvent($id);

            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }
    
    // === UPDATE EVENT (Använder DAL) ===
    if (isset($_POST['action']) && $_POST['action'] === 'update') {

        $id          = $_POST['id']          ?? null;
        $collection  = $_POST['collection']  ?? '';
        $name        = $_POST['name']        ?? '';
        $location    = $_POST['location']    ?? '';
        $date        = $_POST['date']        ?? '';
        $description = $_POST['description'] ?? '';

        if ($id === null || trim($collection) === '' || trim($name) === '' || 
            trim($location) === '' || trim($date) === '' || trim($description) === ''
        ) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing required fields for update']);
            exit;
        }

        // Här skulle du lägga in din BEHÖRIGHETSKONTROLL (Kritiskt för Sprint 2)
        // if (!hasPermissionToEditEvent($id, $currentUser)) { ... }

        $collection_id = (int)$collection;

        try {
            // ANROP TILL DAL
            $eventDal->updateEvent($id, $collection_id, $name, $location, $date, $description);

            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }


    // === CREATE EVENT (Använder DAL) ===
    $collection  = $_POST['collection']  ?? '';
    $name        = $_POST['name']        ?? '';
    $location    = $_POST['location']    ?? '';
    $date        = $_POST['date']        ?? '';
    $description = $_POST['description'] ?? '';

    // Validering
    if (trim($collection) === '' || trim($name) === '' || trim($location) === '' || 
        trim($date) === '' || trim($description) === ''
    ) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    $collection_id = (int)$collection;
    $imagePath = null;

    // Här skulle du lägga in din BEHÖRIGHETSKONTROLL: 
    // Måste ha behörighet att lägga till i denna collection (Kritiskt för Sprint 2)

    // Ladda upp bild (Affärslogik, inte en DAL-uppgift)
    if (!empty($_FILES['image']['name'])) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) { mkdir($uploadDir, 0777, true); }
        $fileName = time() . '_' . basename($_FILES['image']['name']);
        $targetPath = $uploadDir . $fileName;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            $imagePath = $targetPath;
        }
    }

    try {
        // ANROP TILL DAL
        $newId = $eventDal->createEvent($collection_id, $name, $location, $date, $description, $imagePath);

        echo json_encode(['success' => true, 'id' => $newId]);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// === GET EVENTS (Använder DAL) ===
try {
    // ANROP TILL DAL
    $events = $eventDal->getAllEvents();

    echo json_encode([
        'success' => true,
        'events'  => $events,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
