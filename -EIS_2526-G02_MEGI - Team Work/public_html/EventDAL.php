<?php

// Antag att conexao.php definierar $pdo-objektet för databasanslutning.
// Vi gör ingen require här, den kommer att inkluderas i events_api.php.

class EventDAL {
    private $pdo;

    // Konstruktorn tar emot PDO-anslutningen (Data Access Object)
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Hämtar alla händelser. Måste joina för att få collection.name
     * Istället för collection_id.
     */
    public function getAllEvents() {
        // Observera JOIN-satsen: Hämtar collection.name istället för bara collection_id
        $stmt = $this->pdo->query("
            SELECT  e.event_id,
                    e.collection_id,
                    c.name AS collection_name,
                    e.name,
                    e.location,
                    e.date,
                    e.description,
                    e.rating,
                    e.image
            FROM event e
            JOIN collection c ON e.collection_id = c.collection_id
            ORDER BY e.date ASC
        ");

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($events as $e) {
            $data[] = [
                'id'            => $e['event_id'],
                'collection_id' => $e['collection_id'],
                // Använd det riktiga namnet från JOIN
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
     * Skapar en ny händelse.
     */
    public function createEvent($collection_id, $name, $location, $date, $description, $imagePath) {
        $sql = "INSERT INTO event (collection_id, name, location, date, description, image)
                VALUES (:collection_id, :name, :location, :date, :description, :image)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':collection_id' => $collection_id,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':image'         => $imagePath,
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Uppdaterar en befintlig händelse.
     */
    public function updateEvent($id, $collection_id, $name, $location, $date, $description) {
        $sql = "UPDATE event
                SET collection_id = :collection_id,
                    name          = :name,
                    location      = :location,
                    date          = :date,
                    description   = :description
                WHERE event_id    = :id";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':collection_id' => $collection_id,
            ':name'          => $name,
            ':location'      => $location,
            ':date'          => $date,
            ':description'   => $description,
            ':id'            => (int)$id,
        ]);
    }

    /**
     * Raderar en händelse.
     */
    public function deleteEvent($id) {
        $stmt = $this->pdo->prepare("DELETE FROM event WHERE event_id = :id");
        return $stmt->execute([':id' => (int)$id]);
    }

    // Lägg till en plats för att uppdatera rating senare.
    /*
    public function updateRating($id, $rating) {
        $stmt = $this->pdo->prepare("UPDATE event SET rating = :rating WHERE event_id = :id");
        return $stmt->execute([':rating' => $rating, ':id' => (int)$id]);
    }
    */
}

/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Scripting/EmptyPHP.php to edit this template
 */

