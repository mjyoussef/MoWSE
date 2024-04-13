# m6

#### Crawler

Step 1: Extract URLs and text

```javascript
function map(key, value) {
    /* 
    INPUT:
    key: page ID
    value: URL

    OUTPUT:
    key: URL
    value: HTML
    */
}

function reduce(key, values) {
    /*
    INPUT:
    key: URL
    values: HTML

    OUTPUT:
    key: list of URLs from HTML
    value: text
    */
}
```

The coordinator *only* collects the list of URLs, filters out previously seen URLs, and iteratively repeats this procedure until all URLs have been visited. Each node should also store a subset of URLs with their corresponding text.

Step 2: Generate inverted index for n-grams
```javascript
function map(key, value) {
    /*
    INPUT:
    key: URL
    value: text

    OUTPUT:
    key: URL
    value: list of n-grams
    */
}

function reduce(key, values) {
    /* 
    INPUT:
    key: n-gram
    values: list of URLs

    OUTPUT:
    key: n-gram
    values: list of URLs, ordered (non-increasing order) by frequency
    */
}
```

Given the n-gram to URL mapping, we can find the top k relevant n-grams to a given query by having each node individually identify the top-k results, return them to the coordinator, which then selects the top-k n-grams after aggregating the partial results. This isn't very scalable because a node may store millions of n-grams that it must exhaustively compare to the query. 

Alternative approach:
1. Use a pre-trained Word2Vec model to generate a vector embedding of a document (ie. identify all the words in a document, generate their Word2Vec embeddings, and compute the embedding of the overall embedding of the document as a weighted avg of the word embeddings - weighted by word frequency).
2. The document embeddings can be indexed using something like a KD-tree, B+-tree, Locality Sensitive Hashing, etc.