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

package dev.aws.proto.apps.appcore.api.response;

import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.location.LocationBase;
import dev.aws.proto.core.routing.route.PolylineHelper;
import dev.aws.proto.core.routing.route.SegmentRoute;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Segment {
    private UnitValue<String, Long> distance;
    private UnitValue<String, Long> time;
    private String pointsEncoded;

    public Segment(long distanceInMeters, long distanceInSeconds, String pointsEncoded) {
        this.distance = new UnitValue<>("m", distanceInMeters);
        this.time = new UnitValue<>("sec", distanceInSeconds);
        this.pointsEncoded = pointsEncoded;
    }


    public Segment(SegmentRoute segmentRoute) {
        this(segmentRoute.getDistanceInMeters(), segmentRoute.getDistanceInSeconds(), segmentRoute.getPointsEncoded());
    }

    public static Segment fromSegments(List<DeliverySegment> segments) {
        List<String> encodedPolylines = new ArrayList<>();
        long allDistInMeters = 0;
        long allDistTimeInSec = 0;

        for (int i = 0; i < segments.size(); i++) {
            encodedPolylines.add(segments.get(i).getRoute().pointsEncoded);

            allDistInMeters += segments.get(i).getRoute().getDistance().getValue();
            allDistTimeInSec += segments.get(i).getRoute().getTime().getValue();
        }
        String pointsEncoded = PolylineHelper.concatEncodedPolylines(encodedPolylines);

        return new Segment(allDistInMeters, allDistTimeInSec, pointsEncoded);
    }

    public static Segment between(LocationBase<Distance> origin, LocationBase<Distance> destination) {
        Distance dist = origin.distanceTo(destination);
        String pointsEncoded = PolylineHelper.encodePointsToPolyline(Arrays.asList(origin.getCoordinate(), destination.getCoordinate()));

        return new Segment(dist.getDistanceInMeters(), dist.getDistanceInSeconds(), pointsEncoded);
    }
}
