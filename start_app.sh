#!/bin/sh
set -e
cd "$(dirname "$0")"
echo "Starting Church Visitor Attendance System..."
echo "Use the new browser tab opened by this launcher."
python3 server.py --open-browser
