<?php
/**
 * Prepare Static Files Script
 * 
 * This script scans the assets/images directory structure and generates
 * static JSON files that can be used by the JavaScript application
 * instead of PHP endpoints.
 * 
 * Usage: Run this script once before deploying the static site:
 *   php prepare-static.php
 */

$baseDir = __DIR__;
$imagesDir = $baseDir . '/assets/images';
$dataDir = $baseDir . '/data';

// Create data directory if it doesn't exist
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

/**
 * Recursively scan a directory and return all subdirectories
 */
function getSubfolders($path) {
    $folders = [];
    if (!is_dir($path)) {
        return $folders;
    }
    
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $fullPath = $path . '/' . $item;
        if (is_dir($fullPath)) {
            $folders[] = $item;
        }
    }
    
    sort($folders);
    return $folders;
}

/**
 * Get image files (PNG, JPG, JPEG, GIF) from a directory
 */
function getImages($path) {
    $images = [];
    if (!is_dir($path)) {
        return $images;
    }
    
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $fullPath = $path . '/' . $item;
        if (is_file($fullPath) && preg_match('/\.(png|jpg|jpeg|gif)$/i', $item)) {
            $images[] = $item;
        }
    }
    
    sort($images);
    return $images;
}

/**
 * Get media files (WEBM, MP4, PNG, JPG, JPEG, GIF) from a directory
 */
function getMedia($path) {
    $media = [];
    if (!is_dir($path)) {
        return $media;
    }
    
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || $item === '.DS_Store') {
            continue;
        }
        $fullPath = $path . '/' . $item;
        if (is_file($fullPath) && preg_match('/\.(webm|mp4|png|jpg|jpeg|gif)$/i', $item)) {
            $media[] = $item;
        }
    }
    
    sort($media, SORT_NATURAL);
    return $media;
}

/**
 * Recursively process all directories and generate JSON files
 * Also collects data for JavaScript file generation
 */
function processDirectory($basePath, $relativePath, $imagesDir, $dataDir, &$allData) {
    $fullPath = $basePath . ($relativePath ? '/' . $relativePath : '');
    
    if (!is_dir($fullPath)) {
        return;
    }
    
    // Generate JSON files for this directory
    $folders = getSubfolders($fullPath);
    $images = getImages($fullPath);
    $media = getMedia($fullPath);
    
    // Store data for JavaScript file (use relative path as key)
    $dataKey = $relativePath ?: 'root';
    $allData[$dataKey] = [
        'folders' => $folders,
        'images' => $images,
        'media' => $media
    ];
    
    // Create corresponding directory structure in data/
    $dataPath = $dataDir . ($relativePath ? '/' . $relativePath : '');
    if (!is_dir($dataPath)) {
        mkdir($dataPath, 0755, true);
    }
    
    // Write JSON files
    $foldersFile = $dataPath . '/folders.json';
    $imagesFile = $dataPath . '/images.json';
    $mediaFile = $dataPath . '/media.json';
    
    file_put_contents($foldersFile, json_encode($folders, JSON_PRETTY_PRINT));
    file_put_contents($imagesFile, json_encode($images, JSON_PRETTY_PRINT));
    file_put_contents($mediaFile, json_encode($media, JSON_PRETTY_PRINT));
    
    echo "Processed: " . ($relativePath ?: 'root') . "\n";
    echo "  - Folders: " . count($folders) . "\n";
    echo "  - Images: " . count($images) . "\n";
    echo "  - Media: " . count($media) . "\n";
    
    // Recursively process subdirectories
    foreach ($folders as $folder) {
        $newRelativePath = $relativePath ? $relativePath . '/' . $folder : $folder;
        processDirectory($basePath, $newRelativePath, $imagesDir, $dataDir, $allData);
    }
}

// Increase memory limit for large video files (prepare script runs once)
ini_set('memory_limit', '2G');

// Start processing
echo "Starting static file generation...\n";
echo "Scanning: $imagesDir\n";
echo "Output: $dataDir\n\n";

$allData = [];
processDirectory($imagesDir, '', $imagesDir, $dataDir, $allData);

// Find and encode 360° videos as base64 for file:// protocol support
echo "\nScanning for 360° videos to encode...\n";

// Recursively collect 360 video paths only (no encoding yet)
function collect360VideoPaths($path, $basePath, $imagesDir, &$list) {
    if (!is_dir($path)) {
        return;
    }
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $fullPath = $path . '/' . $item;
        if (is_dir($fullPath)) {
            collect360VideoPaths($fullPath, $basePath, $imagesDir, $list);
        } elseif (is_file($fullPath) && preg_match('/360/i', $item) && preg_match('/\.(webm|mp4)$/i', $item)) {
            $relativePath = str_replace($basePath . '/', '', $fullPath);
            $relativePath = str_replace('assets/images/', '', $relativePath);
            $list[] = [
                'relativePath' => $relativePath,
                'fullPath' => $fullPath,
                'mime' => preg_match('/\.webm$/i', $item) ? 'video/webm' : 'video/mp4',
                'size' => filesize($fullPath),
            ];
        }
    }
}

// Encode one video to base64 chunks (streaming read; only one video in memory at a time)
function encodeOne360Video($fullPath, $mimeType, $fileSize) {
    $handle = fopen($fullPath, 'rb');
    if (!$handle) return null;
    $readChunkSize = 768 * 1024;
    $base64ChunksArray = [];
    $accumulatedBase64 = '';
    $targetChunkSize = floor((1024 * 1024) / 4) * 4;
    while (!feof($handle)) {
        $binaryChunk = fread($handle, $readChunkSize);
        if ($binaryChunk === false || strlen($binaryChunk) === 0) break;
        $accumulatedBase64 .= base64_encode($binaryChunk);
        while (strlen($accumulatedBase64) >= $targetChunkSize) {
            $base64ChunksArray[] = substr($accumulatedBase64, 0, $targetChunkSize);
            $accumulatedBase64 = substr($accumulatedBase64, $targetChunkSize);
        }
    }
    fclose($handle);
    if (strlen($accumulatedBase64) > 0) {
        $padding = (4 - (strlen($accumulatedBase64) % 4)) % 4;
        $base64ChunksArray[] = $accumulatedBase64 . str_repeat('=', $padding);
    }
    return ['chunks' => $base64ChunksArray, 'mime' => $mimeType, 'size' => $fileSize];
}

$video360List = [];
collect360VideoPaths($imagesDir, $imagesDir, $imagesDir, $video360List);
echo "Found " . count($video360List) . " 360° video(s)\n";

// Generate JavaScript data file for file:// protocol support
$jsDataFile = $baseDir . '/assets/data.js';
$jsContent = "// Auto-generated static data file\n";
$jsContent .= "// This file contains all folder/image/media data for offline use\n";
$jsContent .= "// Generated: " . date('Y-m-d H:i:s') . "\n\n";
$jsContent .= "var staticData = " . json_encode($allData, JSON_PRETTY_PRINT) . ";\n";
file_put_contents($jsDataFile, $jsContent);

// Write one .js file per 360° video and a small manifest (load on demand in browser)
if (!empty($video360List)) {
    $asset360Dir = $baseDir . '/assets/360';
    if (!is_dir($asset360Dir)) {
        mkdir($asset360Dir, 0755, true);
    }
    $manifest = [];
    foreach ($video360List as $entry) {
        $fileSizeMB = round($entry['size'] / 1024 / 1024, 2);
        echo "  Encoding: {$entry['relativePath']} ($fileSizeMB MB)\n";
        $data = encodeOne360Video($entry['fullPath'], $entry['mime'], $entry['size']);
        if ($data === null) {
            echo "    Warning: Could not open file for reading\n";
            continue;
        }
        // Safe script id: path with / and . replaced so one file per video
        $scriptId = str_replace(['/', '.'], ['__', '_'], $entry['relativePath']);
        $scriptPath = 'assets/360/' . $scriptId . '.js';
        $fullScriptPath = $baseDir . '/' . $scriptPath;
        $payload = '(function(){window.video360Data=window.video360Data||{};window.video360Data[' . json_encode($entry['relativePath'], JSON_UNESCAPED_SLASHES) . ']=' . json_encode($data, JSON_UNESCAPED_SLASHES) . ';})();';
        file_put_contents($fullScriptPath, $payload);
        $manifest[$entry['relativePath']] = $scriptPath;
        unset($data);
    }
    $manifestJs = $baseDir . '/assets/videos360-manifest.js';
    $manifestContent = "// Auto-generated 360° video manifest – load scripts on demand\n";
    $manifestContent .= "// Generated: " . date('Y-m-d H:i:s') . "\n\n";
    $manifestContent .= "window.video360Data=window.video360Data||{};\n";
    $manifestContent .= "var video360Manifest=" . json_encode($manifest, JSON_UNESCAPED_SLASHES) . ";\n";
    file_put_contents($manifestJs, $manifestContent);
    echo "360° video files: " . count($manifest) . " in assets/360/, manifest: assets/videos360-manifest.js\n";
}

echo "\nDone! Static JSON files have been generated in the 'data' directory.\n";
echo "JavaScript data file generated: assets/data.js\n";
echo "You can now use the static site without PHP, including file:// protocol.\n";
?>
