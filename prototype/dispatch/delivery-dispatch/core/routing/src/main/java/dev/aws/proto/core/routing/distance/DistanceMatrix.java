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

package dev.aws.proto.core.routing.distance;

import dev.aws.proto.core.routing.location.ILocation;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

public class DistanceMatrix implements IDistanceMatrix<Distance> {
    private static final Logger logger = LoggerFactory.getLogger(DistanceMatrix.class);

    private final Map<ILocation, Map<ILocation, Distance>> matrix;
    @Getter
    private final long generatedTime;

    @Getter
    private final DistanceMatrix.Metrics metrics;

    private DistanceMatrix(Map<ILocation, Map<ILocation, Distance>> matrix, long generatedTime) {
        this.matrix = matrix;
        this.generatedTime = generatedTime;

        this.metrics = new Metrics(generatedTime, matrix.size());
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metrics {
        private long generatedTimeInMs;
        private int dimension;
    }

    @Override
    public Distance distanceBetween(ILocation origin, ILocation destination) {
        logger.trace("Calculating distance between {} and {}", origin, destination);
        Map<ILocation, Distance> distanceRow = this.matrix.get(origin);

        return distanceRow.get(destination);
    }

    public static DistanceMatrix generate(List<ILocation> locationList, GraphhopperRouter router) {
        long start = System.currentTimeMillis();
        int locCnt = locationList.size();
        ILocation[] locations = new ILocation[locCnt];
        locationList.toArray(locations);

        logger.debug("DMatrix :: dimension = {}x{} ({} cells)", locCnt, locCnt, locCnt * locCnt);

        // create inverse lookup
        Map<ILocation, Integer> locIdxLookup = new HashMap<>();
        for (int i = 0; i < locCnt; i++) {
            locIdxLookup.put(locations[i], i);
        }

        Distance[][] distances = new Distance[locCnt][locCnt];

        int cellCnt = locCnt * locCnt;
        AtomicInteger ctr = new AtomicInteger(0);
        int onePercentOr1000 = Math.max((cellCnt / 100), 1000);

        IntStream.range(0, cellCnt)
                .parallel()
                .forEach(idx -> {
                    int i = idx / locCnt;
                    int j = idx % locCnt;

                    Distance d = router.travelDistance(locations[i].coordinate(), locations[j].coordinate());
                    distances[i][j] = d;

                    int localCtr = ctr.incrementAndGet();
                    if (localCtr % onePercentOr1000 == 0) {
                        logger.debug("Processing {}/{} ({}%)", localCtr, cellCnt, ((double) localCtr / cellCnt) * 100);
                    }
                });

        Map<ILocation, Map<ILocation, Distance>> matrix = new HashMap<>();
        for (int i = 0; i < locCnt; i++) {
            Map<ILocation, Distance> row = new HashMap<>();
            for (int j = 0; j < locCnt; j++) {
                row.put(locations[j], distances[j][i]); // TODO: review indexing
            }

            matrix.put(locations[i], row);
        }

        long generatedTime = System.currentTimeMillis() - start;

        logger.debug("DistanceMatrix :: calc time = {}ms :: dim = {}x{} :: per cell = {}ms", generatedTime, locCnt, locCnt, ((double) generatedTime / (locCnt * locCnt)));
        logger.debug("DistanceMatrix :: errors = {}", router.getErrorCnt().get());
        router.getErrorCnt().set(0);
        return new DistanceMatrix(matrix, generatedTime);
    }
}
