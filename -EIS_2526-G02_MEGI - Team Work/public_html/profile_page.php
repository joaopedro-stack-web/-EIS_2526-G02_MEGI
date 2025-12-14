<?php
session_start();
require_once "conexao.php"; // cria $pdo (PDO)

// MODO TEMPORÁRIO: simular sessão do utilizador 1 (até o login ficar funcional)
if (!isset($_SESSION["user_id"])) {
    $_SESSION["loggedin"] = true;
    $_SESSION["user_id"]  = 1;
}

$userId = (int) $_SESSION["user_id"];

// Converter caracteres especiais do HTML de forma correta
function h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}

// Modo edição via querystring: só é possível editar se edit=1
$isEdit  = (isset($_GET["edit"]) && $_GET["edit"] === "1");
$error   = "";
$success = "";

/**
 * 1) Handler: Upload de foto de perfil (apenas em modo edição)
 */
if (
    $_SERVER["REQUEST_METHOD"] === "POST"
    && isset($_POST["action"])
    && $_POST["action"] === "upload_profile_picture"
) {
    if (!$isEdit) {
        $error = "Enter edit mode to upload profile picture";
    } elseif (!isset($_FILES["profile_picture"]) || $_FILES["profile_picture"]["error"] !== UPLOAD_ERR_OK) {
        $error = "Profile picture upload error.";
    } else {
        $tmpPath = $_FILES["profile_picture"]["tmp_name"];

        // Validar MIME type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($tmpPath);

        $allowed = [
            "image/jpeg" => "jpg",
            "image/png"  => "png",
            "image/webp" => "webp",
        ];

        if (!isset($allowed[$mime])) {
            $error = "Wrong image format. Use JPG, PNG or WEBP.";
        } else {
            // Garantir pasta de uploads
            $uploadDir = __DIR__ . "/uploads/profile_pictures";
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0775, true);
            }

            if (!is_dir($uploadDir)) {
                $error = "Error: Could not create upload folder.";
            } else {
                $ext     = $allowed[$mime];
                $newName = "u" . $userId . "_" . bin2hex(random_bytes(2)) . "." . $ext;

                $destPath     = $uploadDir . "/" . $newName;
                $relativePath = "uploads/profile_pictures/" . $newName;

                if (!move_uploaded_file($tmpPath, $destPath)) {
                    $error = "Could not save the image in the server.";
                } else {
                    $stmtPic = $pdo->prepare("
                        UPDATE user
                        SET profile_picture = :p
                        WHERE user_id = :id
                    ");
                    $stmtPic->execute([
                        ":p"  => $relativePath,
                        ":id" => $userId,
                    ]);

                    $success = "Profile picture uploaded.";
                }
            }
        }
    }
}

/**
 * 2) Handler: Update do perfil (apenas em modo edição)
 */
if (
    $_SERVER["REQUEST_METHOD"] === "POST"
    && isset($_POST["action"])
    && $_POST["action"] === "update_profile"
) {
    if (!$isEdit) {
        $error = "To edit profile data, enter edit mode.";
    } else {
        $name  = trim($_POST["name"] ?? "");
        $email = trim($_POST["email"] ?? "");
        $dob   = trim($_POST["date_of_birth"] ?? ""); // YYYY-MM-DD ou vazio

        if ($name === "" || $email === "") {
            $error = "Name and email required.";
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = "Invalid email";
        } elseif ($dob !== "" && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob)) {
            $error = "Invalid date of birth. Use YYYY-MM-DD format.";
        } else {
            $stmtUpdate = $pdo->prepare("
                UPDATE user
                SET name = :name,
                    email = :email,
                    date_of_birth = :dob
                WHERE user_id = :id
            ");
            $stmtUpdate->execute([
                ":name"  => $name,
                ":email" => $email,
                ":dob"   => ($dob === "" ? null : $dob),
                ":id"    => $userId,
            ]);

            $success = "Profile data updated.";
            $isEdit  = false; // volta ao modo leitura após guardar
        }
    }
}

/**
 * 3) Fetch do utilizador (sempre no fim, para renderizar com dados atuais)
 */
$stmt = $pdo->prepare("
    SELECT user_id, name, username, email, date_of_registration, date_of_birth, profile_picture
    FROM user
    WHERE user_id = :id
    LIMIT 1
");
$stmt->execute([":id" => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo "User not found (user_id=" . h($userId) . ").";
    exit;
}

// Mapear campos para a UI
$profileName        = $user["name"] ?? $user["username"] ?? "";
$profileEmail       = $user["email"] ?? "";
$profileSince       = $user["date_of_registration"] ?? "";
$profileDateOfBirth = $user["date_of_birth"] ?? "";

// FOTO SEMPRE vinda da BD (fallback para default)
$profilePic = $user["profile_picture"] ?? "";
if ($profilePic === "") {
    $profilePic = "imagens.profile_team/pessoa.png";
}
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
                <svg aria-hidden="true" class="icon" role="img" viewBox="0 0 24 24">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.33 0-8 2.67-8 6v1h16v-1c0-3.33-2.67-6-8-6Z"></path>
                </svg>
                <span>Profile</span>
            </button>

            <!-- ✅ LOGOUT -->
            <button
                type="button"
                class="btn btn--ghost"
                aria-label="Logout"
                onclick="window.location.href='logout.php';"
                title="Logout"
            >
                <svg aria-hidden="true" class="icon" role="img" viewBox="0 0 24 24">
                    <path d="M10 17v-2h4v-6h-4V7l-5 5 5 5Zm9 4H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v4h-2V5H5v14h14v-4h2v4c0 1.1-.9 2-2 2Z"></path>
                </svg>
                <span>Logout</span>
            </button>
        </div>
    </header>

    <!-- SIDEBAR -->
    <aside class="sidebar" aria-label="Primary">
        <button
            type="button"
            class="btn btn--primary sidebar__cta"
            aria-label="Create a new collection"
            id="create-collection"
        >
            <svg aria-hidden="true" class="icon" role="img" viewBox="0 0 24 24">
                <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"></path>
            </svg>
            <span>Create New Collection</span>
        </button>

        <nav class="sidebar__nav" aria-label="Main navigation">
            <ul class="sidebar__list">
                <li><a class="sidebar__link" href="Homepage.login.html">Collector</a></li>

                <li>
                    <a class="sidebar__link" href="event.html" data-nav="events">
                        Events
                    </a>
                </li>
                <li>
                    <a class="sidebar__link" href="team_page2.html" data-nav="community">
                        Community
                    </a>
                </li>
            </ul>
        </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main id="main-content" class="profile">
        <div class="profile-content">

            <!-- LEFT: Profile picture -->
            <div class="profile-left">

                <img
                    src="<?php echo h($profilePic); ?>"
                    alt="User picture"
                    class="profile-pic"
                    id="profileImage"
                >

                <?php if ($isEdit): ?>
                    <form
                        method="POST"
                        action="profile_page.php?edit=1"
                        enctype="multipart/form-data"
                        class="profile-pic-form"
                        style="margin-top: 12px;"
                    >
                        <input type="hidden" name="action" value="upload_profile_picture">

                        <input
                            type="file"
                            id="photoInput"
                            name="profile_picture"
                            accept="image/*"
                            class="sr-only"
                        />

                        <button
                            type="button"
                            class="btn btn--primary btn--block"
                            id="changePhotoBtn"
                            onclick="document.getElementById('photoInput').click();"
                        >
                            Choose Picture
                        </button>

                        <button
                            type="submit"
                            class="btn btn--secondary btn--block"
                            style="margin-top: 10px;"
                        >
                            Preview
                        </button>
                    </form>
                <?php else: ?>
                    <div style="height: 44px;"></div>
                <?php endif; ?>

            </div>

            <!-- RIGHT: Profile info -->
            <div class="profile-right">

                <div class="profile-header">
                    <h2 class="profile-title">Profile details</h2>

                    <button
                        type="button"
                        class="btn btn--secondary"
                        id="editProfileBtn"
                        onclick="window.location.href='profile_page.php?edit=1';"
                    >
                        Edit Profile
                    </button>
                </div>

                <?php if ($error !== ""): ?>
                    <p style="color: red; margin: 0 0 12px 0;"><?php echo h($error); ?></p>
                <?php endif; ?>

                <?php if ($success !== ""): ?>
                    <p style="color: green; margin: 0 0 12px 0;"><?php echo h($success); ?></p>
                <?php endif; ?>

                <?php if ($isEdit): ?>
                    <form method="POST" action="profile_page.php?edit=1" class="profile-edit-form">
                        <input type="hidden" name="action" value="update_profile">

                        <div class="info-grid">

                            <div class="info-box">
                                <p class="label">Name</p>
                                <input class="value" type="text" name="name" value="<?php echo h($profileName); ?>" required>
                            </div>

                            <div class="info-box">
                                <p class="label">Date of birth</p>
                                <input class="value" type="date" name="date_of_birth" value="<?php echo h($profileDateOfBirth); ?>">
                            </div>

                            <div class="info-box">
                                <p class="label">Here since</p>
                                <p class="value"><?php echo h($profileSince); ?></p>
                            </div>

                            <div class="info-box">
                                <p class="label">E-mail</p>
                                <input class="value" type="email" name="email" value="<?php echo h($profileEmail); ?>" required>
                            </div>

                        </div>

                        <div style="margin-top: 16px; display: flex; gap: 8px;">
                            <button type="submit" class="btn btn--primary">Save</button>
                            <button type="button" class="btn btn--ghost" onclick="window.location.href='profile_page.php';">
                                Cancel
                            </button>
                        </div>
                    </form>
                <?php else: ?>
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

                        <div class="info-box email-box">
                            <p class="label">E-mail</p>
                            <p class="value email-ellipsis" title="<?php echo h($profileEmail); ?>">
                                <?php echo h($profileEmail); ?>
                            </p>
                        </div>

                    </div>
                <?php endif; ?>

            </div>

        </div>
    </main>

    <!-- FOOTER -->
    <footer class="footer">
        <small>© 2025 Collecta•Hub — Team EIS_2526-G02-MEGI</small>
    </footer>

</div>

<script src="common/nav.js" defer></script>

</body>
</html>
