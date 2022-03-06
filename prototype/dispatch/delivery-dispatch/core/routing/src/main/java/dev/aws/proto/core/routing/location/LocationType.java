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

import java.io.IOException;
import java.io.ObjectInputStream;
import java.util.Arrays;
import java.util.Optional;

public enum LocationType implements Comparable<LocationType> {
    /**
     * Destination location. E.g.: customer
     */
    DESTINATION(1),

    /**
     * Origin location. E.g.: restaurant, supplier, seller
     */
    ORIGIN(2),

    /**
     * Moving location. E.g.: moving driver receiving an instant delivery order
     */
    MOVING_LOCATION(4),

    /**
     * Warehouse location. (This represents interim warehouse while delivering with multiple hops)
     */
    WAREHOUSE(8);

    private final int value;

    private LocationType(int value) {
        this.value = value;
    }

    static LocationType of(ObjectInputStream inputStream) throws IOException {
        int value = inputStream.readInt();
        Optional<LocationType> locationType = Arrays.stream(LocationType.values())
                .filter(lt -> lt.value == value)
                .findFirst();

        return locationType.get();
    }

    public int value() {
        return value;
    }
}
