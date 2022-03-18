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

package dev.aws.proto.apps.instant.sequential.api.response;

import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.routing.route.DeliverySegment;
import dev.aws.proto.core.routing.route.SegmentRoute;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@SuperBuilder
public class DispatchResult extends dev.aws.proto.apps.appcore.api.response.DispatchResult {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Assignment {
        private String driverId;
        private String driverIdentity;
        private List<DeliverySegment> segments;
        private SegmentRoute route;
    }


    private String executionId;
    private DistanceMatrix.Metrics distanceMatrixMetrics;
    private List<Assignment> assigned;
    private List<String> unassigned;

}
