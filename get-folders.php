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

$folders = [];
$items = scandir($basePath);

foreach ($items as $item) {
    if ($item !== '.' && $item !== '..' && is_dir($basePath . '/' . $item)) {
        $folders[] = $item;
    }
}

sort($folders);
echo json_encode($folders);
?>
