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

import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.location.LocationBase;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Objects;

/**
 * Represents a segment route.
 * Includes distance information and an encoded string representation for the routing points on the map.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SegmentRoute extends Distance {
    private String pointsEncoded;

    public SegmentRoute(Distance dist, String pointsEncoded) {
        super(dist.getDistanceInMeters(), dist.getDistanceInSeconds());
        this.pointsEncoded = pointsEncoded;
    }

    public static SegmentRoute between(LocationBase<Distance> origin, LocationBase<Distance> destination) {
        Distance dist = origin.distanceTo(destination);
        String pointsEncoded = PolylineHelper.encodePointsToPolyline(Arrays.asList(origin.getCoordinate(), destination.getCoordinate()));

        return new SegmentRoute(dist, pointsEncoded);
    }

    @Override
    public int hashCode() {
        return Objects.hash(pointsEncoded, super.getDistanceInMeters(), super.getDistanceInSeconds());
    }
}
