#!/bin/bash

# Remove all files and directories inside the "../store/" directory
rm -rf store/*

# Clear the terminal screen
clear

# Run the Node.js script "crawl.js"
node engine/crawl.js