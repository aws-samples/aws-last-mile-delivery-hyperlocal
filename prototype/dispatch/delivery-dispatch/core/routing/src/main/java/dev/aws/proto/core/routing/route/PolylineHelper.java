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

package dev.aws.proto.core.routing.route;

import com.mapbox.geojson.Point;
import com.mapbox.geojson.utils.PolylineUtils;
import dev.aws.proto.core.routing.location.Coordinate;

import java.util.List;
import java.util.stream.Collectors;

public class PolylineHelper {
    // From MapBox docs:
    // precision - OSRMv4 uses 6, OSRMv5 and Google uses 5
    private static final int OSRMv4_PRECISION = 6;
    private static final int OSRMv5_PRECISION = 5;

    public static String encodePointsToPolyline(List<Coordinate> points) {
        List<Point> path = points.stream().map(c -> Point.fromLngLat(c.getLongitude(), c.getLatitude())).collect(Collectors.toList());
        return PolylineUtils.encode(path, OSRMv4_PRECISION);
    }
}
