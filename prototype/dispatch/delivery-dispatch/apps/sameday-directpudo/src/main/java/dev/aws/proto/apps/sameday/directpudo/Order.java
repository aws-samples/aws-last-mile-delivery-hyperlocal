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

package dev.aws.proto.apps.sameday.directpudo;

import dev.aws.proto.apps.sameday.directpudo.data.Parcel;
import dev.aws.proto.apps.sameday.directpudo.data.Timeframe;
import dev.aws.proto.core.routing.location.CoordinateWithId;
import lombok.Data;

import java.util.List;

/**
 * Represents an Order in the sameday-directpudo delivery domain.
 */
@Data
public class Order extends dev.aws.proto.core.Order {

    /**
     * Represents the pickup location for the Order.
     */
    @Data
    public static class Origin extends CoordinateWithId {
        private int preparationTimeInMins;
        private List<String> tags;

        public String toString() {
            return super.toString() + " | prepTime=" + preparationTimeInMins;
        }
    }

    @Data
    public static class Payload {
        private String deliveryType;
        private Timeframe pickupTimeframe;
        private Timeframe dropoffTimeframe;
        private Parcel parcel;
    }

    private Origin origin;
    private CoordinateWithId destination;
    private Payload payload;
}
