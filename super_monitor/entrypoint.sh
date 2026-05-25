#!/bin/sh

# Check if API_KEY is set, otherwise skip replacement
if [ -z "$API_KEY" ]; then
  echo "API_KEY environment variable is not set. Skipping replacement."
else
  echo "Setting API_KEY in config.json..."
  # Use sed to replace the placeholder in the built dist folder
  # We escape the key just in case it contains special characters
  sed -i "s/__API_KEY__/$API_KEY/g" /app/dist/config.json
fi

# Run the command passed to the container (node server.js)
exec "$@"
