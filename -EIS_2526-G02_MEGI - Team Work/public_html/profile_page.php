<?php
session_start();
require_once "conexao.php"; // cria $pdo

// MODO TEMPORÁRIO: simular sessão do utilizador 1 (até o login ficar funcional)
if (!isset($_SESSION["user_id"])) {
    $_SESSION["loggedin"] = true;
    $_SESSION["user_id"]  = 1;
}

$userId = (int) $_SESSION["user_id"];

// Buscar dados do utilizador
$stmt = $pdo->prepare("
    SELECT user_id, name, username, email, date_of_registration, date_of_birth
    FROM user
    WHERE user_id = :id
    LIMIT 1
");
$stmt->execute([":id" => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo "Utilizador não encontrado (user_id=" . htmlspecialchars((string) $userId) . ").";
    exit;
}

function h($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}

// Mapear campos para a UI
$profileName  = $user["name"] ?? $user["username"] ?? "";
$profileEmail = $user["email"] ?? "";
$profileSince = $user["date_of_registration"] ?? "";
$profileDateOfBirth = $user["date_of_birth"] ?? "";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <meta name="app-base" content="">
    <meta name="item-page-path" content="index.html">
    <meta name="events-page-path" content="event.html">
    <meta name="collection-page-path" content="collection-page.html">
    <meta name="collectors-page-path" content="Homepage.login.html">
    <meta name="community-page-path" content="team_page2.html">

    <title>User Profile</title>

    <link rel="stylesheet" href="css.profile_team/profile_page1.css" />
</head>
<body>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="layout">

    <!-- TOPBAR -->
    <header class="topbar" role="banner" aria-label="Site top bar">
        <a class="topbar__brand" href="Homepage.login.html">
            Collecta<span class="topbar__dot">•</span>Hub
        </a>

        <div class="topbar__actions">
            <button
                type="button"
                class="btn btn--ghost"
                aria-label="Open profile"
                onclick="window.location.href='profile_page.php';"
            >
                <svg
                    aria-hidden="true"
                    class="icon"
                    role="img"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.33 0-8 2.67-8 6v1h16v-1c0-3.33-2.67-6-8-6Z"></path>
                </svg>
                <span>Profile</span>
            </button>
        </div>
    </header>

    <!-- SIDEBAR -->
    <aside class="sidebar" aria-label="Primary">
        <button
            type="button"
            class="btn btn--primary sidebar__cta"
            aria-label="Create a new collection"
            data-nav="create"
        >
            <svg
                aria-hidden="true"
                class="icon"
                role="img"
                viewBox="0 0 24 24"
            >
                <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"></path>
            </svg>
            <span>Create New Collection</span>
        </button>

        <nav class="sidebar__nav" aria-label="Main navigation">
            <ul class="sidebar__list">
                <li>
                    <a class="sidebar__link" href="Homepage.login.html">
                        Collector..
                    </a>
                </li>
                <li>
                    <a class="sidebar__link" href="collection-page.html">
                        Collections
                    </a>
                </li>
                <li>
                    <a class="sidebar__link" href="event.html">
                        Events
                    </a>
                </li>
                <li>
                    <a class="sidebar__link" href="team_page2.html">
                        Community
                    </a>
                </li>
            </ul>
        </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main id="main-content" class="profile">
        <div class="profile-content">

            <div class="profile-left">
                <img
                    src="imagens.profile_team/pessoa.png"
                    alt="Foto do utilizador"
                    class="profile-pic"
                    id="profileImage"
                >

                <button
                    type="button"
                    class="btn btn--primary btn--block"
                    id="changePhotoBtn"
                >
                    Change Profile Picture
                </button>

                <input
                    type="file"
                    id="photoInput"
                    accept="image/*"
                    class="sr-only"
                />
            </div>

            <div class="profile-right">

                <div class="profile-header">
                    <h2 class="profile-title">Profile details</h2>

                    <button
                        type="button"
                        class="btn btn--secondary"
                        id="editProfileBtn"
                    >
                        Edit Profile
                    </button>
                </div>

                <div class="info-grid">

                    <div class="info-box">
                        <p class="label">Name</p>
                        <p class="value"><?php echo h($profileName); ?></p>
                    </div>

                    <div class="info-box">
                        <p class="label">Date of birth</p>
                        <p class="value"><?php echo h($profileDateOfBirth); ?></p>
                    </div>

                    <div class="info-box">
                        <p class="label">Here since</p>
                        <p class="value"><?php echo h($profileSince); ?></p>
                    </div>

                    <div class="info-box">
                        <p class="label">E-mail</p>
                        <p class="value"><?php echo h($profileEmail); ?></p>
                    </div>

                </div>
            </div>

        </div>
    </main>

    <!-- FOOTER -->
    <footer class="footer">
        <small>
            © 2025 Collecta•Hub — Team EIS_2526-G02-MEGI
        </small>
    </footer>

</div>

<script src="js.profile_team/profile_page1.js"></script>
<script src="common/nav.js" defer></script>

</body>
</html>
