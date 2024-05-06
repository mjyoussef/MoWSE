# README

**MoWSe** (Mean of Words Search) is a lightweight, scalable search engine that leverages event-driven, asynchronous processing and distributed MapReduce workflows. On just a single machine, MoWSe is capable of crawling and indexing tens of thousands of pages and executing queries in just a few milliseconds!

Under the hood, pages are embedded using a tf-idf-weighted average of the GloVe embeddings of the page's words, and they are stored in a distributed vector database that quantizes and indexes those vectors to minimize memory usage and reduce query latency.

## Setup

1. Run `npm install` to install all Node.js dependencies.
2. Make sure to have Python 3.10+ installed.
3. Run `pip install requirements.txt` to install Python dependencies for ChromaDB.

## Crawling

To crawl locally, run `./engine/local/crawl.sh --maxIters <number of crawling iterations> --numNodes <number of workers>`. There are also several optional flags that can be provided, including `--alpha` and `--beta`, which are hyperparameters for pruning crawled pages for a subsequent crawling iteration (see `engine/crawler.js`). Using the default choices of alpha and beta, we recommend running no more than 5 iterations to avoid getting rate limited by the Wikipedia API.

If you would like to resume crawling from a previous run, you must provide the `--persist` flag. This flag does not accept any parameters.

## Querying

## Troubleshooting

### Conflicting Servers

When a node is spawned, it launches its own ChromaDB server / database. The database logs are accessible under the `/database` directory. Before the server is launched, any existing processes with conflicting ports are shutdown by having `distribution.js` invoke the `kill_chroma.sh` script. If, for some unexpected reason, you run into Chroma server conflicts, you can manually inspect these processes using `ps aux | grep chroma` and terminate a process using `kill <pid>`.

### ChromaDB

Most ChromaDB errors happen because you have an outdated version of a dependency installed on your computer. To fix this, run `pip install <library> --upgrade`.

If upgrading doesn't seem to resolve the issue, check out their troubleshooting guide: https://docs.trychroma.com/troubleshooting.
