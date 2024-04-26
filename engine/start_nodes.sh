#!/bin/bash

# Remove all files and directories inside the "../vecStore/" directory
rm -rf vecStore_data/*

# Clear the terminal screen
clear

# Run the Node.js script "start_nodes.js"
node engine/start_nodes.js