#!/bin/bash
cd /home/kavia/workspace/code-generation/connection-status-indicator-5735-5744/connection_status_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

