#!/bin/bash

# Check if the port number is provided as an argument
if [[ -z $1 ]]; then
  echo "Usage: $0 <port>"
  exit 1
fi

# Assign the provided argument to the PORT variable
PORT=$1

# Find the PID of the process using the specified port
PID=$(lsof -t -i :$PORT)

# Check if a process is found using the port
if [[ -n $PID ]]; then
  echo "Terminating process $PID using port $PORT"
  kill -9 $PID
else
  echo "No process found using port $PORT. Ready to launch server."
fi