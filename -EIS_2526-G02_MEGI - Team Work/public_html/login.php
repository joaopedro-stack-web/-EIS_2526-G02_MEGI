<?php
session_start();
require "connect.php";

// If user already logged in
if (isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true) {
    header("location: Homepage.logout.html");
    exit;
}

$username = $password = "";
$username_err = $password_err = $login_err = "";

// If form submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Username
    if (empty(trim($_POST["username"]))) {
        $username_err = "Please enter your username.";
    } else {
        $username = trim($_POST["username"]);
    }

    // Password
    if (empty(trim($_POST["password"]))) {
        $password_err = "Please enter your password.";
    } else {
        $password = trim($_POST["password"]);
    }

    // Validate
    if (empty($username_err) && empty($password_err)) {

        $sql = "SELECT * FROM users WHERE username='$username'";
        $result = mysqli_query($conn, $sql);

        if (mysqli_num_rows($result) === 1) {
            $user = mysqli_fetch_assoc($result);

            if (password_verify($password, $user["password"])) {

                $_SESSION["loggedin"] = true;
                $_SESSION["username"] = $user["username"];

                header("location: homepage.php");
                exit;
            } else {
                $login_err = "Incorrect password.";
            }
        } else {
            $login_err = "No account found with that username.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>

    <style>
        :root {
            --bg: #ffffff;
            --text: #111;
            --primary: #000000;
            --accent: #ff0000;
            --border: #e5e7eb;
            --radius: 14px;
            --shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
            --font: "Inter", sans-serif;
        }

        body {
            margin: 0;
            font-family: var(--font);
            background: radial-gradient(circle at 8px 8px, rgba(0,0,0,0.05) 1px, transparent 1px) 0 0/24px 24px,
                        var(--bg);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: var(--text);
        }

        .login-container {
            background: #ffffff;
            padding: 32px 28px;
            width: 360px;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            text-align: center;
        }

        h1 {
            font-size: 1.8rem;
            margin-bottom: 8px;
            color: var(--primary);
        }

        .subtitle {
            color: #555;
            margin-bottom: 26px;
        }

        .form-group {
            text-align: left;
            margin-bottom: 18px;
        }

        label {
            font-weight: 600;
            font-size: 14px;
            display: block;
            margin-bottom: 6px;
        }

        input {
            width: 100%;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--border);
            font-size: 15px;
            outline: none;
            transition: border 0.3s;
        }

        input:focus {
            border-color: var(--accent);
        }

        .login-btn {
            width: 100%;
            padding: 12px 0;
            background: var(--primary);
            color: #ffffff;
            font-weight: 700;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.25s, transform 0.1s;
        }

        .login-btn:hover {
            background: var(--accent);
            color: #fff;
            transform: translateY(-1px);
        }

        .error-box {
            background: #ffcccc;
            color: #900;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .register-text {
            margin-top: 18px;
            font-size: 0.9rem;
            color: #444;
        }

        .register-text a {
            color: var(--accent);
            font-weight: 600;
            text-decoration: none;
        }
    </style>
</head>
<body>

<div class="login-container">
    <h1>Welcome back </h1>
    <p class="subtitle">Log into your account</p>

    <?php if (!empty($login_err)) : ?>
        <div class="error-box"><?= $login_err ?></div>
    <?php endif; ?>

    <form action="login.php" method="POST">

        <div class="form-group">
            <label>Username</label>
            <input name="username" type="text" value="<?= htmlspecialchars($username); ?>">
            <small style="color:red;"><?= $username_err ?></small>
        </div>

        <div class="form-group">
            <label>Password</label>
            <input name="password" type="password">
            <small style="color:red;"><?= $password_err ?></small>
        </div>

        <button class="login-btn">Log In</button>

        <p class="register-text">
            Don't have an account? <a href="register.php">Sign up</a>
        </p>
    </form>
</div>

</body>
</html>
