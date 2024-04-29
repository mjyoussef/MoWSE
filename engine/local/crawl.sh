#!/bin/bash

# Clear subdirectories before crawling
rm -rf store/*
rm -rf vecStoreData/*

# Clear the terminal screen
clear

# Run the Node.js script "crawl.js"
# (first argument is the number of nodes)
node engine/local/testCrawler.js "$@"