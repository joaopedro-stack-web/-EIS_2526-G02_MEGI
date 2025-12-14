<?php
declare(strict_types=1);

class EventDAL {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Returns all events with their collection name (JOIN).
     * English note: This is what the Events page consumes.
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
            JOIN collection c ON e.collection_id = c.collection_id
            ORDER BY e.date ASC
        ");

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $data = [];

        foreach ($events as $e) {
            $data[] = [
                'id'            => (int)$e['event_id'],
                'collection_id' => (int)$e['collection_id'],
                'collection'    => (string)$e['collection_name'],
                'name'          => (string)$e['name'],
                'location'      => (string)$e['location'],
                'date'          => (string)$e['date'],
                'description'   => (string)$e['description'],
                'rating'        => $e['rating'] !== null ? (int)$e['rating'] : null,
                'image'         => $e['image'] !== null ? (string)$e['image'] : null,
            ];
        }

        return $data;
    }

    /**
     * Used for ownership checks.
     * Owner of an event is the owner of the event's collection.
     */
    public function getEventOwnerId(int $eventId): ?int {
        $stmt = $this->pdo->prepare("
            SELECT c.user_id
            FROM `event` e
            JOIN collection c ON e.collection_id = c.collection_id
            WHERE e.event_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $eventId]);
        $result = $stmt->fetchColumn();
        return $result ? (int)$result : null;
    }

    /**
     * Checks if a given user owns a given collection.
     * English note: Critical security rule.
     */
    public function checkIfUserOwnsCollection(int $userId, int $collectionId): bool {
        $stmt = $this->pdo->prepare("
            SELECT 1
            FROM collection
            WHERE collection_id = :collection_id AND user_id = :user_id
            LIMIT 1
        ");
        $stmt->execute([
            ':collection_id' => $collectionId,
            ':user_id'       => $userId,
        ]);
        return (bool)$stmt->fetchColumn();
    }

    /**
     * Creates a new event (image is optional).
     */
    public function createEvent(
        int $collectionId,
        string $name,
        string $location,
        string $date,
        string $description,
        ?string $imagePath
    ): int {
        $sql = "
            INSERT INTO `event` (collection_id, name, location, date, description, image)
            VALUES (:collection_id, :name, :location, :date, :description, :image)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':collection_id' => $collectionId,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':image'         => $imagePath,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Updates basic fields (image update can be added later).
     */
    public function updateEvent(
        int $id,
        int $collectionId,
        string $name,
        string $location,
        string $date,
        string $description
    ): bool {
        $sql = "
            UPDATE `event`
            SET
                collection_id = :collection_id,
                name          = :name,
                location      = :location,
                date          = :date,
                description   = :description
            WHERE event_id = :id
        ";

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
     * Updates rating.
     */
    public function updateEventRating(int $eventId, int $rating): bool {
        $sql = "UPDATE `event` SET rating = :rating WHERE event_id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':rating' => $rating,
            ':id'     => $eventId,
        ]);
    }

    /**
     * Deletes an event.
     */
    public function deleteEvent(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM `event` WHERE event_id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
