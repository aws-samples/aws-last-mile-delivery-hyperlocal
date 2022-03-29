/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package dev.aws.proto.core.routing.cache.persistence;

import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.util.aws.S3Utility;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * S3 File persistence for the H3DistanceCache:
 * - Exports the cache object to a temporary file and uploads to S3;
 * - Downloads the cache file from S3 and loads it into memory.
 */
public class S3FilePersistence implements ICachePersistence {
    /**
     * The {@link FilePersistence} object to load/write temporary file.
     */
    private final FilePersistence filePersistence;

    /**
     * The bucket name.
     */
    private final String bucketName;

    /**
     * The key path to the cache file in the bucket.
     */
    private final String cacheFileKeyPath;

    public S3FilePersistence(String bucketName, String cacheFileKeyPath) {
        this.bucketName = bucketName;
        this.cacheFileKeyPath = cacheFileKeyPath;

        try {
            String tmpFilePath = Files.createTempFile("h3Distance", ".tmp").toAbsolutePath().toString();
            this.filePersistence = new FilePersistence(tmpFilePath);
        } catch (IOException ioException) {
            ioException.printStackTrace();
            throw new CachePersistenceException("Error creating a temp file for S3 file persistence", ioException);
        }
    }

    /**
     * Exports the cache object into a temporary file, and uploads it to S3.
     *
     * @param h3DistanceCache The cache object.
     */
    @Override
    public void exportCache(H3DistanceCache h3DistanceCache) {
        this.filePersistence.exportCache(h3DistanceCache);
        S3Utility.uploadFile(this.bucketName, this.cacheFileKeyPath, Paths.get(this.filePersistence.getCacheFilePath()));
    }

    /**
     * Downloads the cache file from an S3 bucket to a temporary file and loads it into the memory.
     *
     * @return The cache object.
     */
    @Override
    public H3DistanceCache importCache() {
        S3Utility.downloadFile(this.bucketName, this.cacheFileKeyPath, Paths.get(this.filePersistence.getCacheFilePath()));
        return this.filePersistence.importCache();
    }
}
