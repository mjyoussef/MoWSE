#!/bin/bash

# Remove all files and directories inside the "../store/" directory
rm -rf vecStore_data/*
# rm -rf vecStore/*

# Clear the terminal screen
clear

# Run the Node.js script "crawl.js"
node engine/start_nodes.js