<?php
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "pos_db";

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $e->getMessage()]));
}
?>