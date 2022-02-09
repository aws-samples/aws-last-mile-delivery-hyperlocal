/*-
 * ========================LICENSE_START=================================
 * Order Dispatcher
 * %%
 * Copyright (C) 2006 - 2022 Amazon Web Services
 * %%
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * =========================LICENSE_END==================================
 */
package com.aws.proto.dispatching.domain.location;

import com.aws.proto.dispatching.routing.Coordinates;
import com.aws.proto.dispatching.routing.Distance;
import com.aws.proto.dispatching.routing.DistanceMatrix;

public class LocationBase implements ILocation, Comparable<LocationBase> {
    // destination ID or origin ID
    private String id;
    private Coordinates coordinates;
    private long leaveDelay;
    private LocationType locationType;
    private DistanceMatrix distanceMatrix;

    protected LocationBase() {
    }

    protected LocationBase(String id, Coordinates coordinates, LocationType locationType) {
        this(id, coordinates, 0L, locationType);
    }

    protected LocationBase(String id, Coordinates coordinates, long leaveDelay, LocationType locationType) {
        this.id = id;
        this.coordinates = coordinates;
        this.leaveDelay = leaveDelay;
        this.locationType = locationType;
    }

    @Override
    public Coordinates coordinates() {
        return coordinates;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Coordinates getCoordinates() {
        return coordinates;
    }

    public void setCoordinates(Coordinates coordinates) {
        this.coordinates = coordinates;
    }

    public DistanceMatrix getDistanceMatrix() {
        return this.distanceMatrix;
    }

    public void setDistanceMatrix(DistanceMatrix distanceMatrix) {
        this.distanceMatrix = distanceMatrix;
    }

    public Distance distanceTo(ILocation other) {
        return this.distanceMatrix.distanceBetween(this, other);
    }

    /**
     * The time needed for doing business between arrival and leaving.
     * E.g.
     * 1. at origin for a driver to park, pickup the food, and leave
     * 2. at destination for a driver to enter premise, park, find destination's apt, go back to bike, leave
     *
     * @return Time spent in MILLISECONDS
     */
    public long getLeaveDelay() {
        return leaveDelay;
    }

    public void setLeaveDelay(long leaveDelay) {
        this.leaveDelay = leaveDelay;
    }

    public LocationType getLocationType() {
        return locationType;
    }

    public void setLocationType(LocationType locationType) {
        this.locationType = locationType;
    }

    @Override
    public int compareTo(LocationBase other) {
        return this.locationType.compareTo(other.locationType);
    }
}
