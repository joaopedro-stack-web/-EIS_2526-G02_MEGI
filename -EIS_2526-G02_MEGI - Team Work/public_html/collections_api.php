<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php'; // precisa definir $pdo (PDO)

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$currentUserId = $_SESSION['user_id'] ?? null;

// Se quiser permitir GET público, mude para false.
// Para home logada, deixe true:
$requireAuthForGet = true;

// =========================
// POST -> create / delete
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!$currentUserId) {
        json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
    }

    $action = (string)($_POST['action'] ?? '');

    // ---------- DELETE ----------
    if ($action === 'delete') {

        $collectionId = (int)($_POST['collection_id'] ?? 0);
        if ($collectionId <= 0) {
            json_out(['success' => false, 'error' => 'ID da coleção inválido.'], 400);
        }

        // garante que é do usuário logado
        $check = $pdo->prepare("
            SELECT collection_id
            FROM collection
            WHERE collection_id = ? AND user_id = ?
            LIMIT 1
        ");
        $check->execute([$collectionId, (int)$currentUserId]);

        if (!$check->fetch()) {
            json_out(['success' => false, 'error' => 'Você não tem permissão para deletar esta coleção.'], 403);
        }

        $del = $pdo->prepare("DELETE FROM collection WHERE collection_id = ?");
        $del->execute([$collectionId]);

        json_out(['success' => true]);
    }

    // ---------- CREATE (com upload) ----------
    if ($action === 'create') {

        $name         = trim((string)($_POST['name'] ?? ''));
        $type         = trim((string)($_POST['type'] ?? ''));
        $creationDate = (string)($_POST['creation_date'] ?? date('Y-m-d'));
        $description  = trim((string)($_POST['description'] ?? ''));

        if ($name === '') {
            json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);
        }

        // Normaliza nulos
        $type = ($type === '') ? null : $type;
        $description = ($description === '') ? null : $description;

        // ============== UPLOAD IMAGE (opcional) ==============
        $imagePath = null;

        if (!empty($_FILES['image']) && is_array($_FILES['image']) && ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {

            if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                json_out(['success' => false, 'error' => 'Erro no upload da imagem.'], 400);
            }

            $originalName = (string)($_FILES['image']['name'] ?? '');
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

            $allowed = ['jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($ext, $allowed, true)) {
                json_out(['success' => false, 'error' => 'Formato inválido. Use JPG/PNG/WEBP.'], 400);
            }

            // Cria pasta se não existir
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

            // Caminho relativo para salvar no banco
            $imagePath = 'uploads/collections/' . $fileName;
        }

        // ============== INSERT ==============
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

            json_out([
                'success' => true,
                'collection_id' => $newId,
                'image' => $imagePath
            ]);
        } catch (Throwable $e) {
            json_out(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    json_out(['success' => false, 'error' => 'Ação inválida.'], 400);
}

// =========================
// GET -> listar/buscar
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if ($requireAuthForGet && !$currentUserId) {
        json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
    }

    // GET ?id=123
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
            if (!$collection) {
                json_out(['success' => false, 'error' => 'Coleção não encontrada.'], 404);
            }

            json_out(['success' => true, 'collection' => $collection]);
        } catch (Throwable $e) {
            json_out(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // Lista do usuário logado
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
