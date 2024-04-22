#!/bin/bash

# URL to make curl requests to
URL="https://en.wikipedia.org/wiki/Computer_science"

# Number of curl requests to make
NUM_REQUESTS=1000

# Loop to make curl requests
for ((i=1; i<=$NUM_REQUESTS; i++)); do
  echo "Making curl request $i..."
  curl -sS $URL > /dev/null
done

# Wait for all curl requests to finish
wait

echo "All curl requests completed."
