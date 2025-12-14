<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php'; // $pdo

function json_out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

/**
 * Lê input tanto de FormData ($_POST) quanto JSON (fetch com application/json)
 */
function read_input(): array {
  if (!empty($_POST)) return $_POST;

  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

$input = read_input();

$currentUserId = $_SESSION['user_id'] ?? null;
$requireAuthForGet = true;

function ensure_owner(PDO $pdo, int $collectionId, int $userId): array {
  $stmt = $pdo->prepare("SELECT * FROM collection WHERE collection_id = ? AND user_id = ? LIMIT 1");
  $stmt->execute([$collectionId, $userId]);
  $col = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$col) json_out(['success' => false, 'error' => 'Coleção não encontrada ou sem permissão.'], 403);
  return $col;
}

function handle_collection_image_upload(): ?string {
  if (empty($_FILES['image']) || !is_array($_FILES['image'])) return null;

  $err = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
  if ($err === UPLOAD_ERR_NO_FILE) return null;
  if ($err !== UPLOAD_ERR_OK) json_out(['success' => false, 'error' => 'Erro no upload da imagem.'], 400);

  $originalName = (string)($_FILES['image']['name'] ?? '');
  $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
  $allowed = ['jpg', 'jpeg', 'png', 'webp'];

  if (!in_array($ext, $allowed, true)) {
    json_out(['success' => false, 'error' => 'Formato inválido. Use JPG/PNG/WEBP.'], 400);
  }

  $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'collections' . DIRECTORY_SEPARATOR;
  if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
      json_out(['success' => false, 'error' => 'Não foi possível criar a pasta de uploads.'], 500);
    }
  }

  $fileName = uniqid('collection_', true) . '.' . $ext;
  $destAbs = $uploadDir . $fileName;

  if (!move_uploaded_file($_FILES['image']['tmp_name'], $destAbs)) {
    json_out(['success' => false, 'error' => 'Falha ao salvar a imagem no servidor.'], 500);
  }

  return 'uploads/collections/' . $fileName;
}

// =========================
// POST
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

  if (!$currentUserId) json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);

  // action pode vir via FormData ou JSON
  $action = (string)($input['action'] ?? '');

  // normaliza variações
  $action = strtolower(trim($action));
  if ($action === 'remove' || $action === 'destroy') $action = 'delete';

  // =========================
  // DELETE COLLECTION (VALIDATED)
  // =========================
  if ($action === 'delete') {
    $userId = (int)$currentUserId;

    $idRaw = $input['id'] ?? $input['collection_id'] ?? null;
    $id = is_numeric($idRaw) ? (int)$idRaw : 0;

    if ($id <= 0) {
      json_out(['success' => false, 'error' => 'Missing collection id'], 400);
    }

    try {
      $pdo->beginTransaction();

      // 1) Verifica se pertence ao user
      $stmt = $pdo->prepare("SELECT collection_id FROM collection WHERE collection_id = ? AND user_id = ? LIMIT 1");
      $stmt->execute([$id, $userId]);
      $owned = $stmt->fetchColumn();

      if (!$owned) {
        $pdo->rollBack();
        json_out(['success' => false, 'error' => 'Forbidden: collection does not belong to user'], 403);
      }

      // 2) Apaga itens (se não tiver cascade)
      // (se a tua tabela de itens tiver outro nome/coluna, me diga que eu ajusto)
      $stmt = $pdo->prepare("DELETE FROM item WHERE collection_id = ?"); 
      $stmt->execute([$id]);

      // 3) Apaga a collection
      $stmt = $pdo->prepare("DELETE FROM collection WHERE collection_id = ? AND user_id = ? LIMIT 1");
      $stmt->execute([$id, $userId]);

      $pdo->commit();
      json_out(['success' => true, 'deleted_id' => $id]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  // =========================
  // CREATE
  // =========================
  if ($action === 'create') {

    $name         = trim((string)($input['name'] ?? ''));
    $type         = trim((string)($input['type'] ?? ''));
    $creationDate = (string)($input['creation_date'] ?? date('Y-m-d'));
    $description  = trim((string)($input['description'] ?? ''));

    if ($name === '') json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);

    $type = ($type === '') ? null : $type;
    $description = ($description === '') ? null : $description;

    // upload só funciona via FormData; se vier JSON, não terá $_FILES e retorna null
    $imagePath = handle_collection_image_upload();

    try {
      $stmt = $pdo->prepare("
        INSERT INTO collection (user_id, name, type, creation_date, description, image)
        VALUES (:user_id, :name, :type, :creation_date, :description, :image)
      ");
      $stmt->execute([
        ':user_id' => (int)$currentUserId,
        ':name' => $name,
        ':type' => $type,
        ':creation_date' => $creationDate,
        ':description' => $description,
        ':image' => $imagePath
      ]);

      $newId = (int)$pdo->lastInsertId();
      json_out(['success' => true, 'collection_id' => $newId, 'image' => $imagePath]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  // =========================
  // UPDATE
  // =========================
  if ($action === 'update') {

    $collectionId = (int)($input['collection_id'] ?? 0);
    if ($collectionId <= 0) json_out(['success' => false, 'error' => 'ID da coleção inválido.'], 400);

    $current = ensure_owner($pdo, $collectionId, (int)$currentUserId);

    $name         = trim((string)($input['name'] ?? ($current['name'] ?? '')));
    $type         = trim((string)($input['type'] ?? ($current['type'] ?? '')));
    $creationDate = (string)($input['creation_date'] ?? ($current['creation_date'] ?? date('Y-m-d')));
    $description  = trim((string)($input['description'] ?? ($current['description'] ?? '')));

    if ($name === '') json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);

    $type = ($type === '') ? null : $type;
    $description = ($description === '') ? null : $description;

    $newImagePath = handle_collection_image_upload(); // pode ser null
    $finalImage = ($newImagePath !== null) ? $newImagePath : ($current['image'] ?? null);

    try {
      $stmt = $pdo->prepare("
        UPDATE collection
        SET name = :name,
            type = :type,
            creation_date = :creation_date,
            description = :description,
            image = :image
        WHERE collection_id = :id AND user_id = :user_id
      ");
      $stmt->execute([
        ':name' => $name,
        ':type' => $type,
        ':creation_date' => $creationDate,
        ':description' => $description,
        ':image' => $finalImage,
        ':id' => $collectionId,
        ':user_id' => (int)$currentUserId
      ]);

      $stmt2 = $pdo->prepare("SELECT * FROM collection WHERE collection_id = ? AND user_id = ? LIMIT 1");
      $stmt2->execute([$collectionId, (int)$currentUserId]);
      $updated = $stmt2->fetch(PDO::FETCH_ASSOC);

      json_out(['success' => true, 'collection' => $updated]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  json_out(['success' => false, 'error' => 'Ação inválida.'], 400);
}


// =========================
// GET
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

  if ($requireAuthForGet && !$currentUserId) {
    json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
  }

  if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];

    try {
      $stmt = $pdo->prepare("
        SELECT *
        FROM collection
        WHERE collection_id = :id AND user_id = :user_id
        LIMIT 1
      ");
      $stmt->execute([':id' => $id, ':user_id' => (int)$currentUserId]);

      $collection = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$collection) json_out(['success' => false, 'error' => 'Coleção não encontrada.'], 404);

      json_out(['success' => true, 'collection' => $collection]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  try {
    $stmt = $pdo->prepare("
      SELECT *
      FROM collection
      WHERE user_id = :user_id
      ORDER BY collection_id DESC
    ");
    $stmt->execute([':user_id' => (int)$currentUserId]);

    $collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_out(['success' => true, 'collections' => $collections]);
  } catch (Throwable $e) {
    json_out(['success' => false, 'error' => $e->getMessage()], 500);
  }
}

json_out(['success' => false, 'error' => 'Método não suportado.'], 405);
