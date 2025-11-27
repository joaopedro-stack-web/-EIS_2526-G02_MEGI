<?php
header('Content-Type: application/json; charset=utf-8');
require 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 👉 CRIAÇÃO DE NOVO EVENTO

    $collection  = $_POST['collection']  ?? '';
    $name        = $_POST['name']        ?? '';
    $location    = $_POST['location']    ?? '';
    $date        = $_POST['date']        ?? '';
    $description = $_POST['description'] ?? '';

    // validação básica
    if (
        trim($collection)  === '' ||
        trim($name)        === '' ||
        trim($location)    === '' ||
        trim($date)        === '' ||
        trim($description) === ''
    ) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    // por enquanto consideramos que "collection" é o ID numérico da coleção
    $collection_id = (int)$collection;
    $imagePath = null;

    // upload de imagem (opcional)
    if (!empty($_FILES['image']['name'])) {
        $uploadDir = 'uploads/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName   = time() . '_' . basename($_FILES['image']['name']);
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            // guardamos caminho relativo
            $imagePath = $targetPath;
        }
    }

    try {
        $sql = "INSERT INTO event (collection_id, name, location, date, description, image)
                VALUES (:collection_id, :name, :location, :date, :description, :image)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':collection_id' => $collection_id,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':image'         => $imagePath,
        ]);

        $newId = $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'id'      => $newId,
        ]);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => $e->getMessage(),
        ]);
        exit;
    }
}

// 👉 SE NÃO FOR POST, ENTÃO É GET → LISTA EVENTOS

try {
    $stmt = $pdo->query("
        SELECT 
            event_id,
            collection_id,
            name,
            location,
            date,
            description,
            rating,
            image
        FROM event
        ORDER BY date ASC
    ");

    $events = $stmt->fetchAll();

    $data = [];
    foreach ($events as $e) {
        $data[] = [
            'id'          => $e['event_id'],
            // por enquanto, coleção é mostrada como "Collection X" usando o ID
            'collection'  => 'Collection ' . $e['collection_id'],
            'name'        => $e['name'],
            'location'    => $e['location'],
            'date'        => $e['date'],
            'description' => $e['description'],
            'rating'      => $e['rating'],
            'image'       => $e['image'],
        ];
    }

    echo json_encode([
        'success' => true,
        'events'  => $data,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
