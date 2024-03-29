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

package dev.aws.proto.apps.sameday.directpudo.api.response;

import dev.aws.proto.apps.appcore.api.response.DeliverySegment;
import dev.aws.proto.apps.appcore.api.response.Segment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * A delivery job represents a delivery route that is serving a list of orders
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryJob {
    /**
     * Delivery Job ID
     */
    private UUID id;

    /**
     * The timestamp of the dispatching request.
     */
    private long createdAt;

    /**
     * The solver job ID (problemID) that created this delivery job.
     */
    private UUID solverJobId;

    /**
     * List of routing segments.
     */
    private List<DeliverySegment> segments;

    /**
     * The segment route representation of all the segments (whole assignment).
     */
    private Segment route;
}
