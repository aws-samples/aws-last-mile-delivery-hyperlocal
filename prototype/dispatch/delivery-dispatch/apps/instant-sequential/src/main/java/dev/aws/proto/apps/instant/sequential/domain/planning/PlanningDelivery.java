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

import dev.aws.proto.apps.instant.sequential.Order;
import dev.aws.proto.apps.instant.sequential.location.DestinationLocation;
import dev.aws.proto.apps.instant.sequential.location.OriginLocation;
import dev.aws.proto.apps.instant.sequential.util.Constants;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.location.LocationBase;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.lookup.PlanningId;
import org.optaplanner.core.api.domain.variable.AnchorShadowVariable;
import org.optaplanner.core.api.domain.variable.PlanningVariable;
import org.optaplanner.core.api.domain.variable.PlanningVariableGraphType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;

@PlanningEntity
@Data
@NoArgsConstructor
public class PlanningDelivery implements DeliveryOrDriver {
    private static final Logger logger = LoggerFactory.getLogger(PlanningDelivery.class);

    private Order order;
    private OriginLocation pickup;
    private DestinationLocation dropoff;
    @Setter
    private long planningId;

    @PlanningVariable(
            valueRangeProviderRefs = {Constants.PlanningDriverRange, Constants.PlanningDeliveryRange},
            graphType = PlanningVariableGraphType.CHAINED
    )
    private DeliveryOrDriver previousDeliveryOrDriver;

    private PlanningDelivery nextPlanningDelivery;

    @AnchorShadowVariable(sourceVariableName = Constants.PreviousDeliveryOrDriver)
    @Setter
    private PlanningDriver planningDriver;

    public PlanningDelivery(Order order, OriginLocation pickup, DestinationLocation dropoff) {
        this.order = order;
        this.pickup = pickup;
        this.dropoff = dropoff;

        this.planningId = Objects.hash(this.order.getOrderId());
    }

    public long getOrderCreatedAt() {
        return this.order.getCreatedAt();
    }

    @PlanningId
    public long getPlanningId() {
        return planningId;
    }

    public PlanningDelivery self() {
        return this;
    }

    @Override
    public PlanningDriver getPlanningDriver() {
        return this.planningDriver;
    }

    @Override
    public PlanningDelivery getNextPlanningDelivery() {
        return this.nextPlanningDelivery;
    }

    @Override
    public void setNextPlanningDelivery(PlanningDelivery nextPlanningDelivery) {
        this.nextPlanningDelivery = nextPlanningDelivery;
    }

    @Override
    public boolean isDriver() {
        return false;
    }

    private String printChain() {
        DeliveryOrDriver curr = this;

        while (!curr.isDriver()) {
            curr = ((PlanningDelivery) curr).previousDeliveryOrDriver;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("[D :: ");
        sb.append(((PlanningDriver) curr).getShortId());
        sb.append("] :: ");

        curr = curr.getNextPlanningDelivery();
        while (curr != null) {
            sb.append("[");
            sb.append(((PlanningDelivery) curr).getOrder().getShortId());
            sb.append("] ");

            curr = curr.getNextPlanningDelivery();
        }

        return sb.toString();
    }

    public long diffBetweenCurrPickupAndPrevDropoffPlusTravel() {
        if (previousDeliveryOrDriver == null) {
            throw new IllegalStateException("This method must not be called when the previousTripOrVehicle is not initialized yet.");
        }

        if (previousDeliveryOrDriver.isDriver()) {
            return 0L;
        }

        PlanningDelivery previous = (PlanningDelivery) previousDeliveryOrDriver;

        long dist = previous.getDropoff().distanceTo(this.getPickup()).getTime();

        // difference between current pickupTime and previous dropoff + travel dist between prev.dropoffLoc -> current.pickupLoc
//        long diffBetweenCurrPickupAndPrevDropoffPlusTravel = this.getPickupTimestamp() -
//          (previous.getDropoffTimestamp() + dist);
//
//        return diffBetweenCurrPickupAndPrevDropoffPlusTravel;
        return 0L;
    }

    public long lateFromFromPreviousDelivery() {
        long diffBetweenCurrPickupAndPrevDropoffPlusTravel = this.diffBetweenCurrPickupAndPrevDropoffPlusTravel();

        // if it arrived on time, don't penalize (if above positive)
        // otherwise, return abs
        return diffBetweenCurrPickupAndPrevDropoffPlusTravel < 0L ?
//          this.getConstraintsWeights().getTimeFrameWeightedValue(-diffBetweenCurrPickupAndPrevDropoffPlusTravel)
                1L
                : 0L;
    }

    public Distance getDistanceFromPrevDriverOrDelivery() {
        if (previousDeliveryOrDriver.isDriver()) {
            return this.getPlanningDriver().getLocation().distanceTo(this.getPickup());
        } else {
            return ((PlanningDelivery) previousDeliveryOrDriver).dropoff.distanceTo(this.pickup);
        }
    }

    public long scoreForPreferCloserDriverToPickupLocation() {
        Distance dist = this.getDistanceFromPrevDriverOrDelivery();

        long distInSec = dist.getTime() / 1000;
        long distInMeters = dist.getDistance();
        return distInSec * distInMeters;
    }

    public long scoreForDistance(LocationBase otherLocation) {
        Distance dist = otherLocation.distanceTo(this.getPickup());

        long distInSec = dist.getTime() / 1000;
        long distInMeters = dist.getDistance();
        return distInSec * distInMeters;
    }
}
