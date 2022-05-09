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

package dev.aws.proto.apps.distancecache.util.commands;

import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.persistence.h3.FilePersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.io.File;
import java.util.concurrent.Callable;

@CommandLine.Command(name = "import-h3", header = "Import h3 cache file")
public class ImportH3Cache implements Callable<Integer> {
    private static final Logger logger = LoggerFactory.getLogger(ImportH3Cache.class);

    @CommandLine.Parameters(index = "0", description = "The cache file")
    private File cacheFile;

    @Override
    public Integer call() throws Exception {
        logger.info("Importing cache file from {}", cacheFile.toPath().toString());

        try {
            FilePersistence filePersistence = new FilePersistence(cacheFile.toPath().toString());
            H3DistanceCache distanceCache = filePersistence.importCache();

            int dim = distanceCache.getH3Hexagons().length;
            logger.info("Distance Cache loaded successfully to memory.");
            logger.info("Number of hexagons: {}", dim);
            logger.info("H3 resolution: {}", distanceCache.getH3Resolution());
            logger.info("Matrix size: {}x{} ({} cells)", dim, dim, dim * dim);

            return 0;
        } catch (Exception ex) {
            logger.error("Error while loading distance cache file: {}", ex.getMessage());
            ex.printStackTrace();

            return 1;
        }
    }
}
