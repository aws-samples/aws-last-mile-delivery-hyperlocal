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
package dev.aws.proto.apps.instant.sequential.location;

import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.LocationType;
import lombok.Data;

import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Represents a location of "Origin" type.
 * This is usually pickup point, e.g.: restaurant, seller, etc.
 */
@Data
public class OriginLocation extends Location {
    /**
     * The time that takes to arriving to the origin, parking, picking up the item and be able to leave the location.
     * Default: Random number between 120k and 420k milliseconds (2 to 7 minutes).
     * <p>
     * The waiting time in MILLISECONDS
     */
    private long leaveDelayInMillis;

    public OriginLocation(String id, Coordinate coordinate) {
        this(id, coordinate, ThreadLocalRandom.current().nextLong(120000L, 420000L));
    }

    public OriginLocation(String id, Coordinate coordinate, long leaveDelayInMillis) {
        super(id, coordinate, LocationType.ORIGIN);

        this.leaveDelayInMillis = leaveDelayInMillis;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(this.getId());
    }
}
