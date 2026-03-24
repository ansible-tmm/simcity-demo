#!/bin/bash
# Simple local web server starter script
# This allows the site to work properly with 360° videos

echo "Starting local web server..."
echo ""
echo "The site will be available at:"
echo "  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first, then Python 2, then PHP
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
elif command -v php &> /dev/null; then
    php -S localhost:8000
else
    echo "Error: No suitable web server found."
    echo "Please install Python 3, Python 2, or PHP."
    exit 1
fi
