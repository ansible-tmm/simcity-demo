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

$media = [];
$items = scandir($basePath);

foreach ($items as $item) {
    if ($item === '.' || $item === '..' || $item === '.DS_Store') {
        continue;
    }
    $fullPath = $basePath . '/' . $item;
    if (is_file($fullPath) && preg_match('/\.(webm|mp4|png|jpg|jpeg|gif)$/i', $item)) {
        $media[] = $item;
    }
}

sort($media, SORT_NATURAL);
echo json_encode($media);
