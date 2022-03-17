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
package dev.aws.proto.apps.instant.sequential.domain.planning;

import dev.aws.proto.apps.instant.sequential.location.DriverLocation;
import dev.aws.proto.core.routing.distance.Distance;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.optaplanner.core.api.domain.lookup.PlanningId;

import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanningDriver implements DeliveryOrDriver {
    private String id;
    private String driverIdentity;
    private DriverLocation location;
    private String status;

    // Shadow variable
    private PlanningDelivery nextPlanningDelivery;

    @PlanningId
    public String getId() {
        return this.id;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(this.id);
    }

    @Override
    public PlanningDriver getPlanningDriver() {
        return this;
    }

    @Override
    public PlanningDelivery getNextPlanningDelivery() {
        return nextPlanningDelivery;
    }

    @Override
    public void setNextPlanningDelivery(PlanningDelivery nextPlanningDelivery) {
        this.nextPlanningDelivery = nextPlanningDelivery;
    }

    @Override
    public boolean isDriver() {
        return true;
    }

    public String getShortId() {
        return this.id.substring(0, 8);
    }

    public Distance getDistanceFromPickup(PlanningDelivery delivery) {
        return this.getLocation().distanceTo(delivery.getPickup());
    }

    public long chainLength() {
        DeliveryOrDriver current = this;
        long chainLen = 0;
        while (current.getNextPlanningDelivery() != null) {
            current = current.getNextPlanningDelivery();
            chainLen++;
        }
        return chainLen;
    }

    public long scoreForOccupancy() {
        if (this.getNextPlanningDelivery() == null) {
            return 1L;
        }
        return 0L;
    }
}
