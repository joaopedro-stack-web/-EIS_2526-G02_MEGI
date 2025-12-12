<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

require 'conexao.php'; // precisa fornecer $pdo (PDO)

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Lê body como JSON (quando fetch manda application/json)
$raw = file_get_contents('php://input');
$bodyJson = [];
if ($raw) {
    $tmp = json_decode($raw, true);
    if (is_array($tmp)) $bodyJson = $tmp;
}

// Unifica dados: $_POST (form) + JSON body
$data = array_merge($_POST ?? [], $bodyJson ?? []);

$currentUserId = $_SESSION['user_id'] ?? null;

// =========================
// AUTH (opcional no GET público)
// =========================
// Se você quiser permitir listar coleções públicas sem login, comente este bloco.
// Por padrão eu protejo o POST e o GET por usuário.
$requireAuthForGet = true;

// =========================
// POST -> criar coleção
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!$currentUserId) {
        json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
    }

    $action = $data['action'] ?? 'create';
    if ($action !== 'create') {
        json_out(['success' => false, 'error' => 'Ação inválida.'], 400);
    }

    $name         = trim((string)($data['name'] ?? ''));
    $type         = trim((string)($data['type'] ?? ''));
    $creationDate = (string)($data['creation_date'] ?? date('Y-m-d'));
    $description  = trim((string)($data['description'] ?? ''));
    $image        = trim((string)($data['image'] ?? ''));

    if ($name === '') {
        json_out(['success' => false, 'error' => 'O campo "name" é obrigatório.'], 400);
    }

    // Normaliza nulos
    $type = ($type === '') ? null : $type;
    $description = ($description === '') ? null : $description;
    $image = ($image === '') ? null : $image;

    // ✅ IMPORTANTE:
    // Ajuste os nomes das colunas para bater com o seu MySQL.
    // Aqui eu suponho uma tabela "collection" com colunas:
    // collection_id (AI), user_id, name, type, creation_date, description, image
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
            ':image' => $image
        ]);

        $newId = (int)$pdo->lastInsertId();

        json_out([
            'success' => true,
            'collection_id' => $newId,
            'redirect_url' => 'collection-page.html?id=' . urlencode((string)$newId)
        ]);
    } catch (Throwable $e) {
        json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// =========================
// GET -> buscar/listar
// =========================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if ($requireAuthForGet && !$currentUserId) {
        json_out(['success' => false, 'error' => 'Usuário não autenticado.'], 401);
    }

    // GET ?id=123 -> busca uma coleção
    if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];

        try {
            // Protege: só retorna se for do usuário logado (se auth estiver ativo)
            if ($requireAuthForGet) {
                $stmt = $pdo->prepare("
                    SELECT *
                    FROM collection
                    WHERE collection_id = :id AND user_id = :user_id
                    LIMIT 1
                ");
                $stmt->execute([':id' => $id, ':user_id' => (int)$currentUserId]);
            } else {
                $stmt = $pdo->prepare("
                    SELECT *
                    FROM collection
                    WHERE collection_id = :id
                    LIMIT 1
                ");
                $stmt->execute([':id' => $id]);
            }

            $collection = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$collection) {
                json_out(['success' => false, 'error' => 'Coleção não encontrada.'], 404);
            }

            json_out(['success' => true, 'collection' => $collection]);
        } catch (Throwable $e) {
            json_out(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // GET ?user_id=5 -> lista coleções de um usuário
    // Se não vier user_id, usa o logado
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : (int)$currentUserId;

    // Se o GET estiver protegido, impede listar coleções de outro user
    if ($requireAuthForGet && $userId !== (int)$currentUserId) {
        json_out(['success' => false, 'error' => 'Acesso negado.'], 403);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT *
            FROM collection
            WHERE user_id = :user_id
            ORDER BY collection_id DESC
        ");
        $stmt->execute([':user_id' => $userId]);
        $collections = $stmt->fetchAll(PDO::FETCH_ASSOC);

        json_out(['success' => true, 'collections' => $collections]);
    } catch (Throwable $e) {
        json_out(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// Método não suportado
json_out(['success' => false, 'error' => 'Método não suportado.'], 405);
