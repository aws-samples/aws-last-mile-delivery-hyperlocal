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
import dev.aws.proto.core.routing.distance.TravelDistance;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;

/**
 * Persist the h3 distance cache object to a file, or load it from a file.
 * <p>
 * File format:
 * <p>
 * Bytes     -- Content
 * 4         -- Number of hexagons
 * 4         -- H3 Resolution
 * [Dim x 8] -- Hexagons
 * [Dim * Dim x [8 (meters, long) + 8 (seconds, long) +4 (h3Distance, int) ] ] -- TravelDistances
 */
public class FilePersistence implements ICachePersistence {
    private static final Logger logger = LoggerFactory.getLogger(FilePersistence.class);

    @Getter
    private final String cacheFilePath;

    public FilePersistence(String cacheFilePath) {
        this.cacheFilePath = cacheFilePath;
    }

    /**
     * Persist the cache into a file.
     *
     * @param h3DistanceCache The cache object.
     */
    @Override
    public void exportCache(H3DistanceCache h3DistanceCache) {
        logger.info("Exporting H3DistanceCache (dim = {})", h3DistanceCache.getH3Hexagons().length);

        try (FileOutputStream fos = new FileOutputStream(this.cacheFilePath)) {
            DataOutputStream outputStream = new DataOutputStream(new BufferedOutputStream(fos));

            int dim = h3DistanceCache.getH3Hexagons().length;

            outputStream.writeInt(dim);
            outputStream.writeInt(h3DistanceCache.getH3Resolution());

            long[] hexagons = h3DistanceCache.getH3Hexagons();
            for (int i = 0; i < dim; i++) {
                outputStream.writeLong(hexagons[i]);
            }

            TravelDistance[][] distances = h3DistanceCache.getDistances();

            for (int i = 0; i < dim; i++) {
                for (int j = 0; j < dim; j++) {
                    TravelDistance travelDistance = distances[i][j];

                    outputStream.writeLong(travelDistance.getMeters());
                    outputStream.writeLong(travelDistance.getSeconds());
                    outputStream.writeInt(travelDistance.getH3Distance());
                }
            }

            outputStream.flush();
        } catch (IOException ioEx) {
            logger.error("Error writing h3DistanceCache to data output stream. {}", ioEx.getMessage());
            ioEx.printStackTrace();
        }

        logger.info("Successfully wrote H3DistanceCache to {}", this.cacheFilePath);
    }

    /**
     * Load the h3 distance cache from a file.
     *
     * @return The cache object.
     */
    @Override
    public H3DistanceCache importCache() {
        logger.info("Importing H3DistanceCache from {}", this.cacheFilePath);

        try (FileInputStream fis = new FileInputStream(this.cacheFilePath)) {
            DataInputStream inputStream = new DataInputStream(new BufferedInputStream(fis));

            int dim = inputStream.readInt();
            int resolution = inputStream.readInt();

            long[] hexagons = new long[dim];
            for (int i = 0; i < dim; i++) {
                hexagons[i] = inputStream.readLong();
            }

            TravelDistance[][] distances = new TravelDistance[dim][dim];
            for (int i = 0; i < dim; i++) {
                for (int j = 0; j < dim; j++) {
                    long meters = inputStream.readLong();
                    long seconds = inputStream.readLong();
                    int h3Distance = inputStream.readInt();

                    distances[i][j] = new TravelDistance(meters, seconds, h3Distance);
                }
            }

            H3DistanceCache cache = new H3DistanceCache(hexagons, distances, resolution);
            logger.info("Successfully imported H3DistanceCache from {} (dim = {}).", this.cacheFilePath, cache.getH3Hexagons().length);
            return cache;

        } catch (IOException ioEx) {
            logger.error("Error reading h3DistanceCache from data input stream. {}", ioEx.getMessage());
            ioEx.printStackTrace();

            throw new CachePersistenceException("Error while importing H3DistanceCache", ioEx);
        }
    }
}
