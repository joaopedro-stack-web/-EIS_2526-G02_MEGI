<?php
session_start();

// limpa todas as variáveis de sessão
$_SESSION = [];

// apaga o cookie da sessão (se existir)
if (ini_get("session.use_cookies")) {
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000,
    $params["path"], $params["domain"],
    $params["secure"], $params["httponly"]
  );
}

// destrói a sessão
session_destroy();

// redireciona para a página de logout
header("Location: Homepage.logout.html");
exit;
