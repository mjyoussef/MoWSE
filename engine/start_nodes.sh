#!/bin/bash

# Remove all files and directories inside the "../store/" directory
rm -rf vecStoreData/*
# rm -rf vecStore/*

# Clear the terminal screen
clear

# Run the Node.js script "crawl.js"
node engine/start_nodes.js