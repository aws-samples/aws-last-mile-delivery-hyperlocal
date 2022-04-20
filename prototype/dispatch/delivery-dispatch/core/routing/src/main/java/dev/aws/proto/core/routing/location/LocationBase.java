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

package dev.aws.proto.core.routing.location;

import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.IDistanceMatrix;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Data
@NoArgsConstructor
public class LocationBase<TDistance extends Distance> implements ILocation, Comparable<LocationBase<TDistance>> {
    private String id;
    private Coordinate coordinate;
    private LocationType locationType;
    private IDistanceMatrix<TDistance> distanceMatrix;

    protected LocationBase(String id, Coordinate coordinate, LocationType locationType) {
        this.id = id;
        this.coordinate = coordinate;
        this.locationType = locationType;
    }

    public TDistance distanceTo(ILocation other) {
        return this.distanceMatrix.distanceBetween(this, other);
    }

    @Override
    public Coordinate coordinate() {
        return this.coordinate;
    }

    @Override
    public int compareTo(LocationBase other) {
        return this.locationType.compareTo(other.locationType);
    }

    @Override
    public String toString() {
        return "[" + locationType + "][" + id + "]" + ((Coordinate) coordinate).toString();
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, coordinate, locationType);
    }
}
