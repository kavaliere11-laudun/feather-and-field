#!/bin/bash
# Run a test command with the built village served on port 8770 for just that long: ./withserver.sh node test.mjs ...
cd "$(dirname "$0")"
python3 -m http.server ${PORT:-8770} --directory dist > /dev/null 2>&1 &
SRV=$!
for i in $(seq 1 50); do curl -s -o /dev/null http://localhost:${PORT:-8770}/index.html && break; sleep 0.1; done
"$@"
STATUS=$?
kill $SRV 2>/dev/null
exit $STATUS
