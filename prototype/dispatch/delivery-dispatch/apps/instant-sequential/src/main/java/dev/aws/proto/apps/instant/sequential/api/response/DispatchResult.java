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

import dev.aws.proto.apps.appcore.api.response.DeliverySegment;
import dev.aws.proto.apps.appcore.api.response.Segment;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

/**
 * Represents the result for a dispatching solver job.
 */
@Data
@SuperBuilder
public class DispatchResult extends dev.aws.proto.apps.appcore.api.response.DispatchResult {

    /**
     * Represents the assignment to a driver for one or multiple order.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Assignment {
        /**
         * ID of the driver in the system.
         */
        private String driverId;

        /**
         * The identity for the driver used in cognito.
         */
        private String driverIdentity;

        /**
         * List of routing segments.
         */
        private List<DeliverySegment> segments;

        /**
         * The segment route representation of all the segments (whole assignment).
         */
        private Segment route;
    }

    /**
     * Execution ID of the step function that triggered the dispatch request.
     */
    private String executionId;

    /**
     * Distance matrix metric information.
     */
    private DistanceMatrix.Metrics distanceMatrixMetrics;

    /**
     * List of assignments.
     */
    private List<Assignment> assigned;

    /**
     * List of unassigned order IDs.
     */
    private List<String> unassigned;

}
