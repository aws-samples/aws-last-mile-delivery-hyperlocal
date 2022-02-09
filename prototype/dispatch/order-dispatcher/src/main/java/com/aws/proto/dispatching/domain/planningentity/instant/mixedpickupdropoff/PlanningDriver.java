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
package com.aws.proto.dispatching.domain.planningentity.instant.mixedpickupdropoff;

import com.aws.proto.dispatching.domain.location.DriverLocation;
import com.aws.proto.dispatching.domain.planningentity.base.PlanningDriverBase;
import org.optaplanner.core.api.domain.lookup.PlanningId;

public class PlanningDriver extends PlanningDriverBase implements VisitOrDriver {

    // Shadow variable
    private PlanningVisit nextPlanningVisit;

    public PlanningDriver() {
        super();
    }

    public PlanningDriver(PlanningDriverBase data) {
        super(data.getId(), data.getDriverIdentity(), data.getLocation(), data.getStatus());
    }

    public PlanningDriver(String id, String driverIdentity, DriverLocation location, String status) {
        super(id, driverIdentity, location, status);
    }

    @PlanningId
    public String getId() {
        return super.id;
    }

    @Override
    public PlanningDriver getPlanningDriver() {
        return this;
    }

    @Override
    public PlanningVisit getNextPlanningVisit() {
        return this.nextPlanningVisit;
    }

    @Override
    public void setNextPlanningVisit(PlanningVisit nextPlanningVisit) {
        this.nextPlanningVisit = nextPlanningVisit;
    }

    @Override
    public boolean isDriver() {
        return true;
    }

    public long getAssignedVisitCount() {
        return this.chainLength();
    }

    private long chainLength() {
        VisitOrDriver current = this;
        long chainLen = 0;
        while (current.getNextPlanningVisit() != null) {
            current = current.getNextPlanningVisit();
            chainLen++;
        }
        return chainLen;
    }

    public long getAssignedVisitCountPenalty() {
        long chainLength = this.chainLength();
        int maxOrderPerDriver = 2;

        if (chainLength > 2 * maxOrderPerDriver) {
            return 1L;
        }
        return 0L;
    }


}
