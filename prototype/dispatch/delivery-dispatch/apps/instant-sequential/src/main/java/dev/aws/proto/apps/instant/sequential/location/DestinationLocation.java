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
package dev.aws.proto.apps.instant.sequential.location;

import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.LocationBase;
import dev.aws.proto.core.routing.location.LocationType;
import lombok.Data;

import java.util.concurrent.ThreadLocalRandom;

@Data
public class DestinationLocation extends LocationBase {
    /**
     * The time that takes from arriving to destination to delivering the item and be able to leave the location.
     *
     * The time in MILLISECONDS
     */
    private long leaveDelayInMillis;

    public DestinationLocation(String id, Coordinate coordinate) {
        this(id, coordinate, ThreadLocalRandom.current().nextLong(0L, 120000L));
    }

    public DestinationLocation(String id, Coordinate coordinate, long leaveDelayInMillis) {
        super(id, coordinate, LocationType.DESTINATION);

        this.leaveDelayInMillis = leaveDelayInMillis;
    }
}
