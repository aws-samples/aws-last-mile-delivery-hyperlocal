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


import dev.aws.proto.core.routing.location.Coordinate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a delivery segment which is part of an order assignment for a driver.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliverySegment {

    /**
     * Type of the segment.
     */
    public static enum SegmentType {
        TO_ORIGIN,
        TO_DESTINATION,
        TO_WAREHOUSE,
    }

    /**
     * ID of the order
     */
    private String orderId;

    /**
     * The index of the segment. ith element of the segment list in the assignment.
     */
    private int index;

    /**
     * Coordinate where the segment starts from.
     */
    private Coordinate from;

    /**
     * Coordinate where the segment ends.
     */
    private Coordinate to;

    /**
     * The type of the segment.
     */
    private SegmentType segmentType;

    /**
     * The route for this segment.
     * Includes distance information and an encoded string representation for the routing points on the map.
     */
    private SegmentRoute route;

}
