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
package com.aws.proto.dispatching.planner.solution.v2;

import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDelivery;
import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDriver;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
import org.optaplanner.core.api.score.stream.Constraint;
import org.optaplanner.core.api.score.stream.ConstraintFactory;
import org.optaplanner.core.api.score.stream.ConstraintProvider;
import org.optaplanner.core.api.score.stream.Joiners;

import java.util.function.Function;

public class DispatchingConstraintProvider implements ConstraintProvider {
    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        return new Constraint[]{
//          olderOrdersCannotBeAssignedAfterFresher(constraintFactory),
          dontAssignMultipleIfOtherDriversUnassigned(constraintFactory),
          preferCloserDriverToPickupLocation(constraintFactory)
//          preferOccupiedDrivers(constraintFactory)
        };
    }

    // ************************************************************************
    // Hard constraints
    // ************************************************************************

    protected Constraint olderOrdersCannotBeAssignedAfterFresher(ConstraintFactory factory) {
        return factory.from(PlanningDelivery.class)
          .join(PlanningDelivery.class,
                Joiners.equal(PlanningDelivery::getPlanningDriver, PlanningDelivery::getPlanningDriver),
                Joiners.equal(PlanningDelivery::getNextPlanningDelivery, Function.identity()),
                Joiners.greaterThan(PlanningDelivery::getOrderTimestamp, PlanningDelivery::getOrderTimestamp),
                Joiners.filtering((a, b) -> a.getPlanningId() != b.getPlanningId())
            )
          .penalize(
            "olderOrdersCannotBeAssignedAfterFresher",
            HardMediumSoftLongScore.ONE_HARD
          );
    }

    protected Constraint dontAssignMultipleIfOtherDriversUnassigned(ConstraintFactory factory) {
        return factory.from(PlanningDriver.class)
          .join(PlanningDriver.class,
            Joiners.filtering((a, b) -> a.chainLength() == 0 && b.chainLength() > 1),
            Joiners.filtering((a, b) -> a.getId() != b.getId())
            )
          .penalize(
            "dontAssignMultipleIfOtherDriversUnassigned",
            HardMediumSoftLongScore.ONE_HARD
          );
    }

    protected Constraint deliveryPickupMustBeAfterPreviousDropoffPlusTravel(ConstraintFactory factory) {
        return factory.from(PlanningDelivery.class)
          .penalizeLong(
            "deliveryPickupMustBeAfterPreviousDropoffPlusTravel",
            HardMediumSoftLongScore.ONE_HARD,
            PlanningDelivery::lateFromFromPreviousDelivery
          );
    }

//    protected Constraint prioritizeDriversWithHigherXScore(ConstraintFactory factory) {
//        return factory.from(PlanningDriver.class)
//          .rewardLong(
//            "dropoffMustBeAfterPickup",
//            HardMediumSoftLongScore.ONE_SOFT,
//            PlanningDriver::getAcceptanceScore // return a value between 0-100
//          );
//    }

//    protected Constraint hasDriverCancelledThisOrderBefore(ConstraintFactory factory) {
//        return factory.from(PlanningVisit.class)
//          .penalizeLong(
//            "hasDriverCancelledThisOrderBefore",
//            HardMediumSoftLongScore.ONE_SOFT,
//            PlanningVisit::hasDriverCancelledThisOrderBefore
//          );
//    }

    // ************************************************************************
    // Medium constraints
    // ************************************************************************

    /**
     * OBSOLETE
     * @param factory
     * @return
     */
    protected Constraint preferOccupiedDrivers(ConstraintFactory factory) {
        return factory.from(PlanningDriver.class)
          .penalizeLong(
            "preferOccupiedDrivers",
            HardMediumSoftLongScore.ONE_MEDIUM,
            PlanningDriver::scoreForOccupancy
          );
    }

    // ************************************************************************
    // Soft constraints
    // ************************************************************************

    protected Constraint preferCloserDriverToPickupLocation(ConstraintFactory factory) {
//        return factory.from(PlanningDelivery.class)
//          .join(PlanningDriver.class,
//            Joiners.equal(PlanningDelivery::getPlanningDriver, PlanningDriver::getPlanningDriver)
//          )
//          .penalizeLong(
//            "preferCloserDriverToPickupLocation",
//            HardMediumSoftLongScore.ONE_MEDIUM,
//            (delivery, driver) -> delivery.scoreForPreferCloserDriverToPickupLocation()
//          );

        return factory.from(PlanningDelivery.class)
          .join(PlanningDriver.class,
            Joiners.equal(PlanningDelivery::getPlanningDriver, PlanningDriver::getPlanningDriver)
//            Joiners.equal(PlanningDelivery::self, PlanningDriver::getNextPlanningDelivery)
          )
          .penalizeLong(
            "preferCloserDriverToPickupLocation",
            HardMediumSoftLongScore.ONE_MEDIUM,
            (delivery, driver) -> delivery.scoreForDistance(driver.getLocation())
          );
    }
}
