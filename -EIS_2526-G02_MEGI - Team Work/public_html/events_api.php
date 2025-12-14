<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php';
require 'EventDAL.php';

$eventDal = new EventDAL($pdo);
$currentUserId = $_SESSION['user_id'] ?? null;

/**
 * Outputs JSON and exits.
 */
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Safely saves an uploaded image file and returns the saved path (relative).
 *
 * English notes:
 * - This stores files under /uploads/
 * - It validates basic "is image" + extension
 * - DB stores only the relative path (varchar)
 */
function handle_image_upload(string $fieldName = 'image'): ?string {
    if (empty($_FILES[$fieldName]) || empty($_FILES[$fieldName]['name'])) {
        return null;
    }

    if (!isset($_FILES[$fieldName]['tmp_name']) || !is_uploaded_file($_FILES[$fieldName]['tmp_name'])) {
        return null;
    }

    $tmp  = $_FILES[$fieldName]['tmp_name'];
    $name = $_FILES[$fieldName]['name'];

    // Basic MIME validation
    $info = @getimagesize($tmp);
    if ($info === false) {
        return null; // Not an image
    }

    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','gif','webp'];
    if (!in_array($ext, $allowed, true)) {
        return null;
    }

    $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Unique filename
    $safeBase = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($name));
    $fileName = time() . '_' . $safeBase;

    $targetAbs = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
    $targetRel = 'uploads/' . $fileName;

    if (!move_uploaded_file($tmp, $targetAbs)) {
        return null;
    }

    return $targetRel;
}

/**
 * POST: action=create|update|delete|rate
 * GET:  list events
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Auth required for all POST actions
    if (!$currentUserId) {
        json_out(['success' => false, 'error' => 'Not authenticated.'], 401);
    }

    $action = $_POST['action'] ?? 'create';

    // =========================
    // DELETE
    // =========================
    if ($action === 'delete') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) {
            json_out(['success' => false, 'error' => 'Missing or invalid event ID'], 400);
        }

        // Owner check
        $ownerId = $eventDal->getEventOwnerId($id);
        if ($ownerId === null || $ownerId !== (int)$currentUserId) {
            json_out(['success' => false, 'error' => 'Permission denied. You are not the owner of this event.'], 403);
        }

        $eventDal->deleteEvent($id);
        json_out(['success' => true]);
    }

    // =========================
    // RATE
    // =========================
    if ($action === 'rate') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        $rating = isset($_POST['rating']) ? (int)$_POST['rating'] : 0;

        if ($id <= 0 || $rating < 1 || $rating > 5) {
            json_out(['success' => false, 'error' => 'Invalid event ID or rating value.'], 400);
        }

        // Rating does not require ownership (any authenticated user can rate)
        $eventDal->updateEventRating($id, $rating);
        json_out(['success' => true]);
    }

    // =========================
    // UPDATE
    // =========================
    if ($action === 'update') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        $collection = trim((string)($_POST['collection'] ?? ''));
        $name = trim((string)($_POST['name'] ?? ''));
        $location = trim((string)($_POST['location'] ?? ''));
        $date = trim((string)($_POST['date'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));

        if ($id <= 0 || $collection === '' || $name === '' || $location === '' || $date === '' || $description === '') {
            json_out(['success' => false, 'error' => 'Missing required fields for update'], 400);
        }

        $ownerId = $eventDal->getEventOwnerId($id);
        if ($ownerId === null || $ownerId !== (int)$currentUserId) {
            json_out(['success' => false, 'error' => 'Permission denied. You are not the owner of this event.'], 403);
        }

        $collectionId = (int)$collection;

        // Optional new image upload
        $imagePath = handle_image_upload('image');
        if ($imagePath !== null) {
            // If you want image updates on update, you need a DAL method.
            // Keeping it simple: update basic fields only (like your current DAL).
            // You can add updateEventWithImage(...) later if needed.
        }

        $eventDal->updateEvent($id, $collectionId, $name, $location, $date, $description);
        json_out(['success' => true]);
    }

    // =========================
    // CREATE (default)
    // =========================
    if ($action === 'create') {
        $collection = trim((string)($_POST['collection'] ?? ''));
        $name = trim((string)($_POST['name'] ?? ''));
        $location = trim((string)($_POST['location'] ?? ''));
        $date = trim((string)($_POST['date'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));

        if ($collection === '' || $name === '' || $location === '' || $date === '' || $description === '') {
            json_out(['success' => false, 'error' => 'Missing required fields'], 400);
        }

        $collectionId = (int)$collection;

        // Ownership check: must own the collection to create events inside it
        if (!$eventDal->checkIfUserOwnsCollection((int)$currentUserId, $collectionId)) {
            json_out(['success' => false, 'error' => 'Permission denied. You do not own this collection.'], 403);
        }

        $imagePath = handle_image_upload('image'); // <-- this is what your collection page now sends

        $newId = $eventDal->createEvent($collectionId, $name, $location, $date, $description, $imagePath);

        json_out(['success' => true, 'id' => $newId]);
    }

    json_out(['success' => false, 'error' => 'Invalid action'], 400);
}

// =========================
// GET: list events
// =========================
try {
    $events = $eventDal->getAllEvents();
    json_out(['success' => true, 'events' => $events]);
} catch (Throwable $e) {
    json_out(['success' => false, 'error' => $e->getMessage()], 500);
}
