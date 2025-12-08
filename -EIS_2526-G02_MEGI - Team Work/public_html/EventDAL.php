<?php

class EventDAL {
    private PDO $pdo;

    // Construtor recebe a conexão PDO
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Busca todos os eventos com o nome da coleção (JOIN).
     */
    public function getAllEvents(): array {
        $stmt = $this->pdo->query("
            SELECT  
                e.event_id,
                e.collection_id,
                c.name AS collection_name,
                e.name,
                e.location,
                e.date,
                e.description,
                e.rating,
                e.image
            FROM `event` e
            JOIN collection c 
              ON e.collection_id = c.collection_id
            ORDER BY e.date ASC
        ");

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $data = [];

        foreach ($events as $e) {
            $data[] = [
                'id'            => (int)$e['event_id'],
                'collection_id' => (int)$e['collection_id'],
                'collection'    => $e['collection_name'],
                'name'          => $e['name'],
                'location'      => $e['location'],
                'date'          => $e['date'],
                'description'   => $e['description'],
                'rating'        => $e['rating'],
                'image'         => $e['image'],
            ];
        }

        return $data;
    }

    /**
     * Cria um novo evento.
     */
    public function createEvent(
        int $collectionId,
        string $name,
        string $location,
        string $date,
        string $description,
        ?string $imagePath
    ): int {
        $sql = "INSERT INTO `event`
                (collection_id, name, location, date, description, image)
                VALUES 
                (:collection_id, :name, :location, :date, :description, :image)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':collection_id' => $collectionId,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':image'         => $imagePath,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Atualiza um evento existente.
     */
    public function updateEvent(
        int $id,
        int $collectionId,
        string $name,
        string $location,
        string $date,
        string $description
    ): bool {
        $sql = "UPDATE `event`
                SET 
                    collection_id = :collection_id,
                    name          = :name,
                    location      = :location,
                    date          = :date,
                    description   = :description
                WHERE event_id    = :id";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':collection_id' => $collectionId,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':id'            => $id,
        ]);
    }

    /**
     * Remove um evento.
     */
    public function deleteEvent(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM `event` WHERE event_id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
