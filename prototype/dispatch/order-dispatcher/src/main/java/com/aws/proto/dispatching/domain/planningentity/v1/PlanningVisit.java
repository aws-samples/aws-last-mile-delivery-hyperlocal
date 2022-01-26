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
package com.aws.proto.dispatching.domain.planningentity.v1;

import com.aws.proto.dispatching.domain.planningentity.base.Order;
import com.aws.proto.dispatching.domain.location.LocationBase;
import com.aws.proto.dispatching.domain.location.LocationType;
import com.aws.proto.dispatching.util.Constants;
import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.lookup.PlanningId;
import org.optaplanner.core.api.domain.variable.AnchorShadowVariable;
import org.optaplanner.core.api.domain.variable.PlanningVariable;
import org.optaplanner.core.api.domain.variable.PlanningVariableGraphType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;
import java.util.function.Predicate;

@PlanningEntity // (difficultyComparatorClass = PlanningVisit.class)
public class PlanningVisit implements VisitOrDriver { // , Comparator<PlanningVisit> {
    private static final Logger logger = LoggerFactory.getLogger(PlanningVisit.class);

    private Order order;
    private LocationBase location;

    // initializes and changes during planning (initially null)
    @PlanningVariable(
      valueRangeProviderRefs = {Constants.PlanningDriverRange, Constants.PlanningVisitRange},
      graphType = PlanningVariableGraphType.CHAINED
    )
    private VisitOrDriver previousVisitOrDriver;

    // shadow variable
    private PlanningVisit nextPlanningVisit;

    @AnchorShadowVariable(sourceVariableName = Constants.PreviousVisitOrDriver)
    private PlanningDriver planningDriver;

    private long planningId;

    public PlanningVisit() {
    }

    public PlanningVisit(Order order, LocationBase location) {
        this.order = order;
        this.location = location;

        this.planningId = Objects.hash(this.order.getOrderId(), this.location.getLocationType());
    }

    public Order getOrder() {
        return order;
    }
    public void setOrder(Order order) {
        this.order = order;
    }

    public LocationBase getLocation() {
        return location;
    }
    public void setLocation(LocationBase location) {
        this.location = location;
    }

    public LocationType getLocationType() {
        return this.location.getLocationType();
    }

    @PlanningId
    public long getPlanningId() {
        return planningId;
    }

    public void setPlanningId(long planningId) {
        this.planningId = planningId;
    }

    @Override
    public PlanningDriver getPlanningDriver() {
        return this.planningDriver;
    }

    public void setPlanningDriver(PlanningDriver planningDriver) {
        this.planningDriver = planningDriver;
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
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlanningVisit that = (PlanningVisit) o;
        return planningId == that.planningId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(planningId);
    }

    @Override
    public boolean isDriver() {
        return false;
    }

    public String getPlanningDriverId() {
        return this.planningDriver.getId();
    }
    //

    private boolean isFirstVisitInChain() {
        return previousVisitOrDriver.getPlanningDriver().equals(previousVisitOrDriver);
    }

    public long limitDriverOrderNumber() {
        int orderNum = 2;
        int chainLength = this.chainLength();

        // there are more than 2 orders
        if(chainLength > 2 * orderNum) {
            return 1L;
        }

        return 0L;
    }

    public long visitIndex() {
        int idx = 0;
        VisitOrDriver current = this;

        while (current != null && !current.isDriver()) {
            idx++;
            current = ((PlanningVisit) current).previousVisitOrDriver;
        }

        return idx;
    }

    public long dropoffAfterPickup() {
        long PENALTY = 10L;

        if (previousVisitOrDriver == null) {
            throw new IllegalStateException("Must not be called when the previousVisitOrDriver is not initialized yet");
        }

        // previous item in the chain is the Driver (root of the chain)
        // --> this one is the first item in the chain
//        boolean isFirstVisitInChain = this.isFirstVisitInChain();
//
//
//        // first item in the chain cannot be CustomerVisit, since that's a dropoff
//        // --> PENALIZE
//        if(isFirstVisitInChain) {
//            if (this.location.getLocationType() == LocationType.CUSTOMER) {
//                return PENALTY;
//            } else {
//                return 0L;
//            }
//        }
//
//        if(this.getPlanningDriver().getShortId().equalsIgnoreCase("b550e4c3") && this.chainLength() > 3) {
//            logger.debug(this.printChain());
//        }

        String orderId = this.getOrder().getOrderId();
        // current visit is at Customer
        // --> must find Restaurant visit up the chain -- same orderId
        // --> must NOT find Restaurant visit down the chain -- same orderId
        if(this.location.getLocationType() == LocationType.CUSTOMER) {
            boolean hasRestaurantVisitWithSameOrderIdBefore = this.walkChainToAnchor(
              visit -> visit.getOrder().getOrderId().equalsIgnoreCase(orderId),
              visit -> visit.getLocation().getLocationType() == LocationType.RESTAURANT
            );

            boolean hasRestaurantVisitWithSameOrderIdAfter = this.walkChainToLeaf(
              visit -> visit.getOrder().getOrderId().equalsIgnoreCase(orderId),
              visit -> visit.getLocation().getLocationType() == LocationType.RESTAURANT
            );

            if(!hasRestaurantVisitWithSameOrderIdBefore || hasRestaurantVisitWithSameOrderIdAfter) {
                return PENALTY;
            }
        }
        // current visit is Restaurant
        // --> must NOT find Customer visit up the chain -- same orderId
        // --> must find Customer visit down the chain -- same orderId
        else {
            boolean notHaveCustomerVisitWithSameOrderIdBefore = this.walkChainToAnchor(
              visit -> visit.getOrder().getOrderId().equalsIgnoreCase(orderId),
              visit -> visit.getLocation().getLocationType() == LocationType.CUSTOMER
            );

            boolean notHaveCustomerVisitWithSameOrderIdAfter = this.walkChainToLeaf(
              visit -> visit.getOrder().getOrderId().equalsIgnoreCase(orderId),
              visit -> visit.getLocation().getLocationType() == LocationType.CUSTOMER
            );

            if(!notHaveCustomerVisitWithSameOrderIdBefore || notHaveCustomerVisitWithSameOrderIdAfter) {
                return PENALTY;
            }
        }

        return 0L;
    }

    private boolean walkChainToAnchor(Predicate<PlanningVisit> matchCondition, Predicate<PlanningVisit> testCond) {
        // move up to the previous item on the chain
        VisitOrDriver current = this.previousVisitOrDriver;


        // while typeof(current) == PlanningVisit
        while (current != null && !current.isDriver()) {
            PlanningVisit curr = (PlanningVisit) current;
            if(matchCondition.test(curr)) {
                return testCond.test(curr);
            }

            current = curr.previousVisitOrDriver;
        }

        return false;
    }

    private boolean walkChainToLeaf(Predicate<PlanningVisit> matchCondition, Predicate<PlanningVisit> test) {
        PlanningVisit current = this.getNextPlanningVisit();

        while(current != null) {
            if(matchCondition.test(current)) {
                return test.test(current);
            }
            current = (PlanningVisit) current.getNextPlanningVisit();
        }

        return false;
    }

    private int chainLength() {
        if (previousVisitOrDriver == null) {
            throw new IllegalStateException("This method must not be called when the previousTripOrVehicle is not initialized yet.");
        }

        VisitOrDriver current = this;
        int chainLength = 0;

        // D <- V1 <- [V2] <- V3 <- V4 <- null
        // V4.previousVisitOrDriver == V3 --->
        // ...
        // V1.previousTripOrVehicle == D ---> V1.getPlanningVehicle == V1.previousTripOrVehicle

        // count following visits (until next == null)
        while (current.getNextPlanningVisit() != null) {
            current = current.getNextPlanningVisit();
            chainLength++;
        }

        // reset current pointer to this
        current = this;

        // count previous visits (until prev == driver)
        while (current != null && current.getPlanningDriver() != current) {
            // --> typeof(prev) == PlanningVisit
            current = ((PlanningVisit) current).previousVisitOrDriver;
            chainLength++;
        }

        return chainLength;
    }

    private String printChain() {
        VisitOrDriver curr = this;

        while (!curr.isDriver()) {
            curr = ((PlanningVisit) curr).previousVisitOrDriver;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("[D :: ");
        sb.append(((PlanningDriver) curr).getShortId());
        sb.append("] :: ");

        curr = curr.getNextPlanningVisit();
        while(curr != null) {
            sb.append("[");
            sb.append(((PlanningVisit) curr).getLocation().getLocationType());
            sb.append("-");
            sb.append(((PlanningVisit) curr).getOrder().getShortId());
            sb.append("] ");

            curr = curr.getNextPlanningVisit();
        }

        return sb.toString();
    }
}
