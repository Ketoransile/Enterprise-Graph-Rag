#!/bin/bash
set -e

echo "Starting Celery worker..."
exec celery -A app.workers.celery_app worker --loglevel=info
