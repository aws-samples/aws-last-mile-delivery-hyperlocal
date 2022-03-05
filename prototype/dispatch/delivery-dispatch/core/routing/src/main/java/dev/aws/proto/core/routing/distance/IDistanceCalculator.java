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

import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.exception.DistanceCalculationException;

import java.util.function.Function;

public interface IDistanceCalculator {

    static <TRouterResponse, TResult>
    TResult travelDistanceSelector(
            TRouterResponse response, Function<TRouterResponse, TResult> selector) {
        return selector.apply(response);
    }

    /**
     * Calculate travel distance.
     *
     * @param origin      origin
     * @param destination destination
     * @return travel distance
     * @throws DistanceCalculationException when the distance between given coordinates cannot be calculated
     */
    Distance travelDistance(Coordinate origin, Coordinate destination);
}
