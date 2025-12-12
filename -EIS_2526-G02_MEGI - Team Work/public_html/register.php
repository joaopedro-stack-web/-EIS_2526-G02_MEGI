<?php
session_start();
require 'conexao.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $name       = trim($_POST['name'] ?? '');
    $username   = trim($_POST['username'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $dob        = trim($_POST['date_of_birth'] ?? ''); // ✅ coluna real: date_of_birth
    $password   = (string)($_POST['password'] ?? '');

    // data de registro no formato DATE
    $dateReg = date('Y-m-d'); // ✅ coluna real: date_of_registration

    if ($name === '' || $username === '' || $email === '' || $password === '') {
        $error = 'Preencha Name, Username, Email e Password.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Email inválido.';
    } else {
        // username único
        $checkU = $pdo->prepare("SELECT 1 FROM user WHERE username = ? LIMIT 1");
        $checkU->execute([$username]);
        if ($checkU->fetchColumn()) {
            $error = 'Esse username já existe.';
        }

        // email único
        if ($error === '') {
            $checkE = $pdo->prepare("SELECT 1 FROM user WHERE email = ? LIMIT 1");
            $checkE->execute([$email]);
            if ($checkE->fetchColumn()) {
                $error = 'Esse email já está em uso.';
            }
        }

        if ($error === '') {
            $hash = password_hash($password, PASSWORD_DEFAULT);

            // DOB pode ser NULL se vazio
            $dobDb = ($dob !== '') ? $dob : null;

            // ✅ INSERT usando os nomes reais das colunas
            $ins = $pdo->prepare("
                INSERT INTO user (name, date_of_birth, date_of_registration, email, username, password)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $ins->execute([$name, $dobDb, $dateReg, $email, $username, $hash]);

            $newId = (int)$pdo->lastInsertId();

            // ✅ loga automaticamente
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id']  = $newId;
            $_SESSION['name']     = $name;
            $_SESSION['username'] = $username;

            header("Location: Homepage.login.html");
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Register</title>

  <!-- CSS que você já tem -->
  <link rel="stylesheet" href="style2without.css" />

  <style>
    .auth-wrap{max-width:520px;margin:40px auto;padding:20px;border-radius:16px;background:#fff}
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
  <h2>Create account</h2>

  <?php if ($error): ?>
    <p class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
  <?php endif; ?>

  <form method="POST" action="register.php" autocomplete="off">

    <div class="auth-row">
      <label>Name *</label>
      <input name="name" required>
    </div>

    <div class="auth-row">
      <label>Username *</label>
      <input name="username" required>
    </div>

    <div class="auth-row">
      <label>Email *</label>
      <input name="email" type="email" required>
    </div>

    <div class="auth-row">
      <label>Date of birth</label>
      <input name="date_of_birth" type="date">
    </div>

    <div class="auth-row">
      <label>Password *</label>
      <input name="password" type="password" required>
    </div>

    <div class="auth-actions">
      <button type="submit">Register</button>
      <a href="login.php">Login</a>
      <a href="Homepage.logout.html">Back</a>
    </div>

  </form>
</div>

</body>
</html>
