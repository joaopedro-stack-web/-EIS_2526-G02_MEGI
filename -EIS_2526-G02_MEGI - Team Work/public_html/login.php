<?php
session_start();
require 'conexao.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = (string)($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = "Preencha usuário e senha.";
    } else {
        $stmt = $pdo->prepare("SELECT user_id, name, username, password FROM user WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $error = "Usuário ou senha inválidos.";
        } else {
            // ✅ aceita hash (novo) e texto (antigo do dump)
            $ok = password_verify($password, $user['password']) || $password === $user['password'];

            if (!$ok) {
                $error = "Usuário ou senha inválidos.";
            } else {
                $_SESSION['loggedin'] = true;
                $_SESSION['user_id']  = (int)$user['user_id'];
                $_SESSION['name']     = $user['name'];
                $_SESSION['username'] = $user['username'];

                header("Location: Homepage.login.html");
                exit;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login</title>

  <link rel="stylesheet" href="style2without.css" />

  <style>
    .auth-wrap{max-width:420px;margin:40px auto;padding:20px;border-radius:16px;background:#fff}
    .auth-row{margin-bottom:14px}
    .auth-row label{display:block;font-weight:600;margin-bottom:6px}
    .auth-row input{width:100%;padding:10px;border-radius:10px;border:1px solid #ddd}
    .auth-actions{display:flex;gap:12px;margin-top:14px;align-items:center}
    .auth-actions button{padding:10px 16px;border-radius:10px;border:0;background:#000;color:#fff;font-weight:700;cursor:pointer}
    .auth-error{color:#b00020;margin-bottom:12px}
    a{color:#000}
  </style>
</head>
<body>

<div class="auth-wrap">
  <h2>Log In</h2>

  <?php if ($error): ?>
    <p class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
  <?php endif; ?>

  <form method="POST" action="login.php" autocomplete="off">
    <div class="auth-row">
      <label>Username</label>
      <input name="username" required>
    </div>

    <div class="auth-row">
      <label>Password</label>
      <input name="password" type="password" required>
    </div>

    <div class="auth-actions">
      <button type="submit">Login</button>
      <a href="register.php">Register</a>
      <a href="Homepage.logout.html">Back</a>
    </div>
  </form>
</div>

</body>
</html>
