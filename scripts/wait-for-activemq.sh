#!/bin/bash
set -e

echo "Waiting for ActiveMQ to be ready..."

for i in {1..60}; do
    if curl -s -u admin:admin http://localhost:8161/admin/xml/brokers.jsp >/dev/null 2>&1; then
        echo "ActiveMQ is ready!"
        exit 0
    fi
    echo "Attempt $i/60 - ActiveMQ not ready yet, waiting 2 seconds..."
    sleep 2
done

echo "ActiveMQ failed to start within 120 seconds"
exit 1