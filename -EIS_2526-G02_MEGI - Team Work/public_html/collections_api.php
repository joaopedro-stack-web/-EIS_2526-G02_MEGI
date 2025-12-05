<?php
header('Content-Type: application/json; charset=utf-8');

session_start();

// 1. Conexão com o banco (pdo)
require 'conexao.php';

// 2. DAL de coleções
require 'CollectionDAL.php';

// 3. Instanciar DAL
$collectionDal = new CollectionDAL($pdo);

// Opcional: se você estiver salvando o usuário logado em sessão,
// use isso aqui. Caso ainda não tenha login, pode trocar por 1
// temporariamente, mas o ideal é usar sempre o id real do usuário.
$currentUserId = $_SESSION['user_id'] ?? null;

try {
    // =========================
    // POST  -> criar coleção
    // =========================
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $action = $_POST['action'] ?? 'create';

        if ($action === 'create') {
            if (!$currentUserId) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Usuário não autenticado.'
                ]);
                exit;
            }

            $name         = trim($_POST['name'] ?? '');
            $type         = trim($_POST['type'] ?? '');
            $creationDate = $_POST['creation_date'] ?? date('Y-m-d');
            $description  = trim($_POST['description'] ?? '');
            $image        = trim($_POST['image'] ?? '');

            if ($name === '') {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'O campo "name" é obrigatório.'
                ]);
                exit;
            }

            // se não tiver imagem, você pode usar um placeholder
            if ($image === '') {
                $image = null;
            }

            $newId = $collectionDal->createCollection(
                (int)$currentUserId,
                $name,
                $type !== '' ? $type : null,
                $creationDate,
                $description !== '' ? $description : null,
                $image
            );

            echo json_encode([
                'success'       => true,
                'collection_id' => $newId,
                // caminho da página da coleção dinâmica
                'redirect_url'  => "collection-page.html?id=" . urlencode($newId)
            ]);
            exit;
        }

        // Se no futuro você quiser ter DELETE/UPDATE de coleção,
        // dá pra aproveitar este mesmo arquivo com outros `action`.
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error'   => 'Ação inválida.'
        ]);
        exit;
    }

    // =========================
    // GET -> listar/buscar
    // =========================
    // GET ?id=123  -> uma coleção específica
    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];
        $collection = $collectionDal->getCollectionById($id);

        if (!$collection) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error'   => 'Coleção não encontrada.'
            ]);
            exit;
        }

        echo json_encode([
            'success'    => true,
            'collection' => $collection
        ]);
        exit;
    }

    // GET ?user_id=5 -> coleções de um usuário específico
    // se não vier user_id na URL, tenta usar o usuário logado
    $userId = isset($_GET['user_id'])
        ? (int) $_GET['user_id']
        : ($currentUserId ? (int)$currentUserId : null);

    if (!$userId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error'   => 'Parâmetro "user_id" ausente e nenhum usuário logado.'
        ]);
        exit;
    }

    $collections = $collectionDal->getCollectionsByUser($userId);

    echo json_encode([
        'success'     => true,
        'collections' => $collections
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
