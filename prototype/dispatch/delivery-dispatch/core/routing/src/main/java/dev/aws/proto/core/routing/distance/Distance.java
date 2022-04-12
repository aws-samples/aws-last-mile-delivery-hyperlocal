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

import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.util.Objects;

@JsonSerialize
public class Distance {

    /**
     * Zero distance, for example the distance from a location to itself.
     */
    public static final Distance ZERO = Distance.ofValue(0L, 0L);

    protected final long distanceInMeters;
    protected final long distanceInSeconds;

    protected Distance() {
        this.distanceInMeters = 0;
        this.distanceInSeconds = 0;
    }

    protected Distance(long distanceInMeters, long distanceInSeconds) {
        this.distanceInMeters = distanceInMeters;
        this.distanceInSeconds = distanceInSeconds;
    }

    /**
     * Create a distanceInMeters of the given value.
     *
     * @param distanceInMeters  distanceInMeters in meters
     * @param distanceInSeconds distanceInSeconds in seconds
     * @return distanceInMeters
     */
    public static Distance ofValue(long distanceInMeters, long distanceInSeconds) {
        return new Distance(distanceInMeters, distanceInSeconds);
    }

    /**
     * Distance in meters.
     *
     * @return positive number or zero
     */
    public long getDistanceInMeters() {
        return distanceInMeters;
    }

    /**
     * Distance in time (milliseconds).
     *
     * @return positive number or zero
     */
    public long getDistanceInSeconds() {
        return distanceInSeconds;
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Distance)) return false;
        Distance distance = (Distance) o;
        return distanceInMeters == distance.distanceInMeters && distanceInSeconds == distance.distanceInSeconds;
    }

    @Override
    public int hashCode() {
        return Objects.hash(distanceInMeters, distanceInSeconds);
    }

    @Override
    public String toString() {
        return String.format(
                "Distance = %dkm %dm | Time = %dh %dm %ds",
                distanceInMeters / 1000,
                distanceInMeters % 1000,
                distanceInSeconds / 3600_000,
                distanceInSeconds / 60_000 % 60,
                distanceInSeconds % 60);
    }
}

