<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php'; // $pdo (PDO)

function json_out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

$currentUserId = $_SESSION['user_id'] ?? null;
$requireAuthForGet = true;

/**
 * Confirma que a collection pertence ao usuário logado.
 */
function user_owns_collection(PDO $pdo, int $collectionId, int $userId): bool {
  $stmt = $pdo->prepare("SELECT collection_id FROM collection WHERE collection_id = ? AND user_id = ? LIMIT 1");
  $stmt->execute([$collectionId, $userId]);
  return (bool)$stmt->fetch();
}

/**
 * Confirma que o item pertence a uma coleção do usuário logado.
 */
function user_owns_item(PDO $pdo, int $itemId, int $userId): bool {
  $stmt = $pdo->prepare("
    SELECT i.item_id
    FROM item i
    JOIN collection c ON c.collection_id = i.collection_id
    WHERE i.item_id = ? AND c.user_id = ?
    LIMIT 1
  ");
  $stmt->execute([$itemId, $userId]);
  return (bool)$stmt->fetch();
}

/**
 * Faz upload opcional da imagem do item.
 */
function handle_item_image_upload(): ?string {
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

  $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'items' . DIRECTORY_SEPARATOR;
  if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
      json_out(['success' => false, 'error' => 'Não foi possível criar a pasta de uploads.'], 500);
    }
  }

  $fileName = uniqid('item_', true) . '.' . $ext;
  $destAbs = $uploadDir . $fileName;

  if (!move_uploaded_file($_FILES['image']['tmp_name'], $destAbs)) {
    json_out(['success' => false, 'error' => 'Falha ao salvar a imagem no servidor.'], 500);
  }

  return 'uploads/items/' . $fileName;
}

// =========================
// POST -> create / update / delete
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

  if (!$currentUserId) {
    json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
  }

  $action = (string)($_POST['action'] ?? '');

  // ---------- CREATE ----------
  if ($action === 'create') {
    $collectionId = (int)($_POST['collection_id'] ?? 0);
    if ($collectionId <= 0) json_out(['success' => false, 'error' => 'collection_id inválido.'], 400);

    if (!user_owns_collection($pdo, $collectionId, (int)$currentUserId)) {
      json_out(['success' => false, 'error' => 'Sem permissão nesta coleção.'], 403);
    }

    $name = trim((string)($_POST['name'] ?? ''));
    if ($name === '') json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);

    $importance = isset($_POST['importance']) && $_POST['importance'] !== '' ? (int)$_POST['importance'] : null;
    $weight = isset($_POST['weight']) && $_POST['weight'] !== '' ? (float)$_POST['weight'] : null;
    $price = isset($_POST['price']) && $_POST['price'] !== '' ? (float)$_POST['price'] : null;
    $date = isset($_POST['date_of_acquisition']) && $_POST['date_of_acquisition'] !== '' ? (string)$_POST['date_of_acquisition'] : null;
    $description = isset($_POST['description']) && trim((string)$_POST['description']) !== '' ? trim((string)$_POST['description']) : null;
    $rating = isset($_POST['rating']) && $_POST['rating'] !== '' ? (int)$_POST['rating'] : null;

    $imagePath = handle_item_image_upload();

    try {
      $stmt = $pdo->prepare("
        INSERT INTO item (collection_id, name, importance, weight, price, date_of_acquisition, description, rating, image)
        VALUES (:collection_id, :name, :importance, :weight, :price, :date_of_acquisition, :description, :rating, :image)
      ");
      $stmt->execute([
        ':collection_id' => $collectionId,
        ':name' => $name,
        ':importance' => $importance,
        ':weight' => $weight,
        ':price' => $price,
        ':date_of_acquisition' => $date,
        ':description' => $description,
        ':rating' => $rating,
        ':image' => $imagePath,
      ]);

      $newId = (int)$pdo->lastInsertId();

      // opcional: atualizar number_of_items na collection
      $pdo->prepare("UPDATE collection SET number_of_items = (SELECT COUNT(*) FROM item WHERE collection_id = ?) WHERE collection_id = ?")
          ->execute([$collectionId, $collectionId]);

      json_out(['success' => true, 'item_id' => $newId, 'image' => $imagePath]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  // ---------- UPDATE ----------
  if ($action === 'update') {
    $itemId = (int)($_POST['item_id'] ?? 0);
    if ($itemId <= 0) json_out(['success' => false, 'error' => 'item_id inválido.'], 400);

    if (!user_owns_item($pdo, $itemId, (int)$currentUserId)) {
      json_out(['success' => false, 'error' => 'Sem permissão neste item.'], 403);
    }

    $name = trim((string)($_POST['name'] ?? ''));
    if ($name === '') json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);

    $importance = isset($_POST['importance']) && $_POST['importance'] !== '' ? (int)$_POST['importance'] : null;
    $weight = isset($_POST['weight']) && $_POST['weight'] !== '' ? (float)$_POST['weight'] : null;
    $price = isset($_POST['price']) && $_POST['price'] !== '' ? (float)$_POST['price'] : null;
    $date = isset($_POST['date_of_acquisition']) && $_POST['date_of_acquisition'] !== '' ? (string)$_POST['date_of_acquisition'] : null;
    $description = isset($_POST['description']) && trim((string)$_POST['description']) !== '' ? trim((string)$_POST['description']) : null;
    $rating = isset($_POST['rating']) && $_POST['rating'] !== '' ? (int)$_POST['rating'] : null;

    $newImage = handle_item_image_upload();

    try {
      if ($newImage !== null) {
        $stmt = $pdo->prepare("
          UPDATE item
          SET name=:name, importance=:importance, weight=:weight, price=:price,
              date_of_acquisition=:date_of_acquisition, description=:description, rating=:rating, image=:image
          WHERE item_id=:item_id
        ");
        $stmt->execute([
          ':name' => $name,
          ':importance' => $importance,
          ':weight' => $weight,
          ':price' => $price,
          ':date_of_acquisition' => $date,
          ':description' => $description,
          ':rating' => $rating,
          ':image' => $newImage,
          ':item_id' => $itemId,
        ]);
      } else {
        $stmt = $pdo->prepare("
          UPDATE item
          SET name=:name, importance=:importance, weight=:weight, price=:price,
              date_of_acquisition=:date_of_acquisition, description=:description, rating=:rating
          WHERE item_id=:item_id
        ");
        $stmt->execute([
          ':name' => $name,
          ':importance' => $importance,
          ':weight' => $weight,
          ':price' => $price,
          ':date_of_acquisition' => $date,
          ':description' => $description,
          ':rating' => $rating,
          ':item_id' => $itemId,
        ]);
      }

      json_out(['success' => true, 'image' => $newImage]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  // ---------- DELETE ----------
  if ($action === 'delete') {
    $itemId = (int)($_POST['item_id'] ?? 0);
    if ($itemId <= 0) json_out(['success' => false, 'error' => 'item_id inválido.'], 400);

    if (!user_owns_item($pdo, $itemId, (int)$currentUserId)) {
      json_out(['success' => false, 'error' => 'Sem permissão neste item.'], 403);
    }

    try {
      // descobrir collection para recalcular contagem
      $colStmt = $pdo->prepare("SELECT collection_id FROM item WHERE item_id = ?");
      $colStmt->execute([$itemId]);
      $row = $colStmt->fetch();
      $collectionId = $row ? (int)$row['collection_id'] : 0;

      $pdo->prepare("DELETE FROM item WHERE item_id = ?")->execute([$itemId]);

      if ($collectionId > 0) {
        $pdo->prepare("UPDATE collection SET number_of_items = (SELECT COUNT(*) FROM item WHERE collection_id = ?) WHERE collection_id = ?")
            ->execute([$collectionId, $collectionId]);
      }

      json_out(['success' => true]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  json_out(['success' => false, 'error' => 'Ação inválida.'], 400);
}

// =========================
// GET -> list by collection_id OR get by item_id
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

  if ($requireAuthForGet && !$currentUserId) {
    json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
  }

  // GET ?item_id=123
  if (isset($_GET['item_id'])) {
    $itemId = (int)$_GET['item_id'];
    if ($itemId <= 0) json_out(['success' => false, 'error' => 'item_id inválido.'], 400);

    if (!user_owns_item($pdo, $itemId, (int)$currentUserId)) {
      json_out(['success' => false, 'error' => 'Sem permissão neste item.'], 403);
    }

    try {
      $stmt = $pdo->prepare("SELECT * FROM item WHERE item_id = ? LIMIT 1");
      $stmt->execute([$itemId]);
      $item = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$item) json_out(['success' => false, 'error' => 'Item não encontrado.'], 404);

      json_out(['success' => true, 'item' => $item]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  // GET ?collection_id=4
  if (isset($_GET['collection_id'])) {
    $collectionId = (int)$_GET['collection_id'];
    if ($collectionId <= 0) json_out(['success' => false, 'error' => 'collection_id inválido.'], 400);

    if (!user_owns_collection($pdo, $collectionId, (int)$currentUserId)) {
      json_out(['success' => false, 'error' => 'Sem permissão nesta coleção.'], 403);
    }

    try {
      $stmt = $pdo->prepare("
        SELECT *
        FROM item
        WHERE collection_id = ?
        ORDER BY item_id DESC
      ");
      $stmt->execute([$collectionId]);
      $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

      json_out(['success' => true, 'items' => $items]);
    } catch (Throwable $e) {
      json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
  }

  json_out(['success' => false, 'error' => 'Parâmetros inválidos. Use ?collection_id= ou ?item_id=.'], 400);
}

json_out(['success' => false, 'error' => 'Método não suportado.'], 405);
