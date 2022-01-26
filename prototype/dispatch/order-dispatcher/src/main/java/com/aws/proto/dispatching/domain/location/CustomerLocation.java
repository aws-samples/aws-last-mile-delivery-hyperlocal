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

import java.util.concurrent.ThreadLocalRandom;

public class CustomerLocation extends LocationBase {

    public CustomerLocation(String id, Coordinates coordinates) {
        this(id, coordinates, ThreadLocalRandom.current().nextLong(0L, 120000L));
    }

    public CustomerLocation(String id, Coordinates coordinates, long leaveDelayInMillis) {
        super(id, coordinates, leaveDelayInMillis, LocationType.CUSTOMER);
    }

    /**
     * The time that takes from arriving to customer to delivering the item and be able to leave the location.
     * @return The delivery time in MILLISECONDS
     */
    @Override
    public long getLeaveDelay() {
        return super.getLeaveDelay();
    }

    @Override
    public String toString() {
        return "CustomerLocation{" + coordinates().toString() +" | deliveryTime=" + getLeaveDelay() + "}";
    }
}
