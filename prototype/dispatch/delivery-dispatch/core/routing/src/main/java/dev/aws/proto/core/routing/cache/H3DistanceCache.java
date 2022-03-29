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

package dev.aws.proto.core.routing.cache;

import com.uber.h3core.H3Core;
import com.uber.h3core.exceptions.DistanceUndefinedException;
import com.uber.h3core.util.GeoCoord;
import dev.aws.proto.core.routing.H3;
import dev.aws.proto.core.routing.cache.inspection.ResolutionChecker;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.TravelDistance;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

/**
 * H3 hexagon distance cache.
 * <p>
 * Contains
 * - a list of h3 hexagons in a certain resolution
 * - a matrix, that contains distances between the centers of these hexagons.
 * <p>
 * Distances are calculated with Graphhopper, using offline OpenStreetMap files (osm.pbf).
 * <p>
 * It can perform a O(1) lookup between two hexagons.
 */
@Getter
public class H3DistanceCache {
    private static final Logger logger = LoggerFactory.getLogger(H3DistanceCache.class);

    private final long[] h3Hexagons;
    private final TravelDistance[][] distances;
    private final int h3Resolution;
    private final Map<Long, Integer> indexLookup;

    public H3DistanceCache(long[] h3Hexagons, TravelDistance[][] distances, int h3Resolution) {
        this.h3Hexagons = h3Hexagons;
        this.distances = distances;
        this.h3Resolution = h3Resolution;

        this.indexLookup = new HashMap<>();
        for (int i = 0; i < h3Hexagons.length; i++) {
            indexLookup.put(h3Hexagons[i], i);
        }
    }

    public TravelDistance getDistance(long hexaFrom, long hexaTo) {
        this.validateResolution(hexaFrom, hexaTo);

        if (!indexLookup.containsKey(hexaFrom) || !indexLookup.containsKey(hexaTo)) {
            return null;
        }

        return distances[indexLookup.get(hexaFrom)][indexLookup.get(hexaTo)];
    }

    /**
     * Validates if the two hexagons are in the distance cache's resolution.
     *
     * @param hexa1 Hexagon 1.
     * @param hexa2 Hexagon 2.
     */
    private void validateResolution(long hexa1, long hexa2) {
        ResolutionChecker.validate(hexa1, this.h3Resolution);
        ResolutionChecker.validate(hexa2, this.h3Resolution);
    }

    /**
     * The cache builder.
     */
    public static class Builder {
        final GraphhopperRouter router;
        final long[] hexagons;
        final int h3Resolution;
        @Getter
        final TravelDistance[][] distances;

        Builder(GraphhopperRouter router, long[] hexagons, int h3Resolution) {
            this.router = router;
            this.hexagons = hexagons;
            this.h3Resolution = h3Resolution;

            int dim = hexagons.length;
            distances = new TravelDistance[dim][dim];
        }

        void build() {
            int dim = this.hexagons.length;
            int cellCnt = dim * dim;

            AtomicInteger ctr = new AtomicInteger(0);
            int onePercentOr1000 = Math.max((cellCnt / 100), 1000);

            IntStream.range(0, cellCnt)
                    .parallel()
                    .forEach(idx -> {
                        int i = idx / dim;
                        int j = idx % dim;

                        distances[i][j] = calculateTravelDistance(hexagons[i], hexagons[j]);

                        int localCtr = ctr.incrementAndGet();
                        if (localCtr % onePercentOr1000 == 0) {
                            logger.debug("Processing {}/{} ({}%)", localCtr, cellCnt, ((double) localCtr / cellCnt) * 100);
                        }
                    });
        }

        private TravelDistance calculateTravelDistance(long hexa1, long hexa2) {
            H3Core h3 = H3.h3();
            GeoCoord hexa1Geo = h3.h3ToGeo(hexa1);
            GeoCoord hexa2Geo = h3.h3ToGeo(hexa2);

            int h3Distance;
            try {
                h3Distance = h3.h3Distance(hexa1, hexa2);
            } catch (DistanceUndefinedException e) {
                h3Distance = -1;
            }

            Distance dist = router.travelDistance(hexa1Geo, hexa2Geo);
            return new TravelDistance(dist.getDistance(), Math.round((double) dist.getTime() / 1000L), h3Distance);
        }
    }

    public static H3DistanceCache generate(List<Long> hexagonList, int h3Resolution, GraphhopperRouter router) {
        long start = System.currentTimeMillis();
        int dim = hexagonList.size();
        long[] hexagons = new long[dim];
        for (int i = 0; i < dim; i++) {
            hexagons[i] = hexagonList.get(i);
        }

        Builder builder = new Builder(router, hexagons, h3Resolution);
        builder.build();

        TravelDistance[][] distances = builder.getDistances();

        long generatedTime = System.currentTimeMillis() - start;
        long sec = generatedTime / 1000;
        long min = sec / 60;

        logger.debug(":: H3DistanceCache :: calculation time = {}ms (~{}m {}s)", generatedTime, min, sec);
        logger.debug(":: H3DistanceCache :: dimension = {} :: cells = {}", dim, dim * dim);
        logger.debug(":: H3DistanceCache :: calc time PER CELL = {}ms", ((double) generatedTime / (dim * dim)));
        logger.debug(":: H3DistanceCache :: router errors: {}", router.getErrorCnt().get());
        router.getErrorCnt().set(0);

        return new H3DistanceCache(hexagons, distances, h3Resolution);
    }

}
