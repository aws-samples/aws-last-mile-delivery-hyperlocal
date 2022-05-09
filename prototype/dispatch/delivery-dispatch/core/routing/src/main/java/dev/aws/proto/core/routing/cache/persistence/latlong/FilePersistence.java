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

package dev.aws.proto.core.routing.cache.persistence.latlong;

import dev.aws.proto.core.routing.cache.persistence.CachePersistenceException;
import dev.aws.proto.core.routing.cache.persistence.ICachePersistence;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.ILocation;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Persist a lat/long distance cache object to a file, or load it from a file.
 * <p>
 * File format:
 * <p>
 * Bytes     -- Content
 * 4         -- Number of points
 * [Dim x (8 + 8)] -- Lat/Long doubles
 * [Dim * Dim x [8 (meters, long) + 8 (seconds, long) ] ] -- Distances
 */
public class FilePersistence implements ICachePersistence<DistanceMatrix> {
    private static final Logger logger = LoggerFactory.getLogger(FilePersistence.class);

    @Getter
    private final String cacheFilePath;

    public FilePersistence(String cacheFilePath) {
        this.cacheFilePath = cacheFilePath;
    }

    /**
     * Persist the cache into a file.
     *
     * @param distanceMatrix The cache object.
     */
    @Override
    public void buildCache(DistanceMatrix distanceMatrix) {
        logger.info("Exporting DistanceMatrix (dim = {})", distanceMatrix.getMetrics().getDimension());

        try (FileOutputStream fos = new FileOutputStream(this.cacheFilePath)) {
            DataOutputStream outputStream = new DataOutputStream(new BufferedOutputStream(fos));

            int dim = distanceMatrix.getMetrics().getDimension();
            outputStream.writeInt(dim);

            ILocation[] locationArr = new ILocation[dim];
            distanceMatrix.getMatrix().keySet().toArray(locationArr);

            for (int i = 0; i < dim; i++) {
                Coordinate coordinate = locationArr[i].coordinate();

                outputStream.writeDouble(coordinate.getLatitude());
                outputStream.writeDouble(coordinate.getLongitude());
            }

            for (int i = 0; i < dim; i++) {
                for (int j = 0; j < dim; j++) {
                    Distance dist_ij = distanceMatrix.distanceBetween(locationArr[i], locationArr[j]);
                    outputStream.writeLong(dist_ij.getDistanceInMeters());
                    outputStream.writeLong(dist_ij.getDistanceInSeconds());
                }
            }

            outputStream.flush();
        } catch (IOException ioEx) {
            logger.error("Error writing distanceMatrix to data output stream. {}", ioEx.getMessage());
            ioEx.printStackTrace();
        }

        logger.info("Successfully wrote distanceMatrix to {}", this.cacheFilePath);
    }

    /**
     * Load the h3 distance cache from a file.
     *
     * @return The cache object.
     */
    @Override
    public DistanceMatrix importCache() {
        logger.info("Importing DistanceMatrix from {}", this.cacheFilePath);
        long start = System.currentTimeMillis();

        Map<ILocation, Map<ILocation, Distance>> matrix = new HashMap<>();

        try (FileInputStream fis = new FileInputStream(this.cacheFilePath)) {
            DataInputStream inputStream = new DataInputStream(new BufferedInputStream(fis));

            int dim = inputStream.readInt();
            ILocation[] locationArr = new ILocation[dim];

            for (int i = 0; i < dim; i++) {
                double latitude = inputStream.readDouble();
                double longitude = inputStream.readDouble();
                Coordinate c = new Coordinate(latitude, longitude);
                ILocation loc = new ILocation() {
                    @Override
                    public Coordinate coordinate() {
                        return c;
                    }
                };

                locationArr[i] = loc;
            }

            for (int i = 0; i < dim; i++) {
                Map<ILocation, Distance> row = new HashMap<>();
                for (int j = 0; j < dim; j++) {
                    long meters_ij = inputStream.readLong();
                    long seconds_ij = inputStream.readLong();

                    Distance dist_ij = Distance.ofValue(meters_ij, seconds_ij);
                    row.put(locationArr[j], dist_ij); // TODO: review indexing
                }

                matrix.put(locationArr[i], row);
            }

            logger.info("Successfully imported DistanceMatrix from {} (dim = {}).", this.cacheFilePath, dim);

            return DistanceMatrix.fromMatrix(matrix);
        } catch (IOException ioEx) {
            logger.error("Error reading distanceMatrix from data input stream. {}", ioEx.getMessage());
            ioEx.printStackTrace();

            throw new CachePersistenceException("Error while importing DistanceMatrix", ioEx);
        }
    }
}
