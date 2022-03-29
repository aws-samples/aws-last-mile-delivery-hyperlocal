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

@JsonSerialize
public class Distance {

    /**
     * Zero distance, for example the distance from a location to itself.
     */
    public static final Distance ZERO = Distance.ofValue(0L, 0L);

    private final long distance;
    private final long time;

    protected Distance() {
        this.distance = 0;
        this.time = 0;
    }

    protected Distance(long distance, long time) {
        this.distance = distance;
        this.time = time;
    }

    /**
     * Create a distance of the given value.
     *
     * @param distance distance in meters
     * @param time     time in milliseconds
     * @return distance
     */
    public static Distance ofValue(long distance, long time) {
        return new Distance(distance, time);
    }

    /**
     * Distance in length.
     *
     * @return positive number or zero
     */
    public long getDistance() {
        return distance;
    }

    /**
     * Distance in time (milliseconds).
     *
     * @return positive number or zero
     */
    public long getTime() {
        return time;
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Distance dist = (Distance) o;
        return dist.distance == this.distance && dist.time == this.time;
    }

    @Override
    public int hashCode() {
        return Long.hashCode(distance);
//        return Long.hashCode(distance) ^ Long.hashCode(time);
    }

    @Override
    public String toString() {
        return String.format(
                "Distance = %dkm %dm | Time = %dh %dm %ds %dms",
                distance / 1000,
                distance % 1000,
                time / 3600_000,
                time / 60_000 % 60,
                time / 1000 % 60,
                time % 1000);
    }
}

