<?php
header('Content-Type: application/json');

$folder = isset($_GET['folder']) ? $_GET['folder'] : '';

if (empty($folder)) {
    echo json_encode([]);
    exit;
}

$basePath = __DIR__ . '/assets/images/' . $folder;

if (!is_dir($basePath)) {
    echo json_encode([]);
    exit;
}

$images = [];
$items = scandir($basePath);

foreach ($items as $item) {
    $fullPath = $basePath . '/' . $item;
    if (is_file($fullPath) && preg_match('/\.(png|jpg|jpeg|gif)$/i', $item)) {
        $images[] = $item;
    }
}

sort($images);
echo json_encode($images);
?>
