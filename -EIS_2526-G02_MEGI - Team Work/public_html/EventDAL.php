<?php

// Esta classe segue o mesmo padrão de EventDAL.php,
// mas operando na tabela `collection`.

class CollectionDAL {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Cria uma nova coleção.
     *
     * Campos da tabela `collection`:
     *  - collection_id (AI)
     *  - user_id
     *  - name
     *  - type
     *  - creation_date
     *  - description
     *  - number_of_items
     *  - image
     */
    public function createCollection(
        int $userId,
        string $name,
        ?string $type,
        string $creationDate,
        ?string $description,
        ?string $imagePath
    ): int {
        $sql = "INSERT INTO collection 
                (user_id, name, type, creation_date, description, number_of_items, image)
                VALUES (:user_id, :name, :type, :creation_date, :description, :number_of_items, :image)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id'        => $userId,
            ':name'           => $name,
            ':type'           => $type,
            ':creation_date'  => $creationDate,
            ':description'    => $description,
            ':number_of_items'=> 0,          // nova coleção começa com 0 itens
            ':image'          => $imagePath,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Retorna todas as coleções de um usuário.
     */
    public function getCollectionsByUser(int $userId): array {
        $sql = "SELECT collection_id, user_id, name, type, creation_date,
                       description, number_of_items, image
                FROM collection
                WHERE user_id = :user_id
                ORDER BY creation_date DESC, collection_id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Busca uma coleção específica por ID.
     */
    public function getCollectionById(int $collectionId): ?array {
        $sql = "SELECT collection_id, user_id, name, type, creation_date,
                       description, number_of_items, image
                FROM collection
                WHERE collection_id = :id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $collectionId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
