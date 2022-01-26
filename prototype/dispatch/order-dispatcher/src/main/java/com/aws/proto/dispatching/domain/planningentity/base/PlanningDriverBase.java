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
package com.aws.proto.dispatching.domain.planningentity.base;

import com.aws.proto.dispatching.domain.location.DriverLocation;

public class PlanningDriverBase {
    protected String id;
    protected String driverIdentity;
    protected DriverLocation location;
    protected String status;

    public PlanningDriverBase() {
    }

    public PlanningDriverBase(String id, String driverIdentity, DriverLocation location, String status) {
        this.id = id;
        this.driverIdentity = driverIdentity;
        this.location = location;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDriverIdentity() {
        return driverIdentity;
    }

    public void setDriverIdentity(String driverIdentity) {
        this.driverIdentity = driverIdentity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public DriverLocation getLocation() {
        return location;
    }

    public void setLocation(DriverLocation location) {
        this.location = location;
    }

    @Override
    public String toString() {
        return String.format("[driver=%s]", this.getShortId());
    }

    public String getShortId() {
        return this.id.substring(0,8);
    }
}
