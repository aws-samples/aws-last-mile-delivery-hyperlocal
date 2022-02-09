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
package com.aws.proto.dispatching.planner.solution.instant.mixedpickupdropoff;

import com.aws.proto.dispatching.domain.planningentity.instant.mixedpickupdropoff.PlanningVisit;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
import org.optaplanner.core.api.score.stream.Constraint;
import org.optaplanner.core.api.score.stream.ConstraintFactory;
import org.optaplanner.core.api.score.stream.ConstraintProvider;
import org.optaplanner.core.api.score.stream.Joiners;

/**
 * DISCLAIMER: MIXED PICKUP DROPOFF SOLUTUTION IS NOT WORKING
 */
public class DispatchingConstraintProvider implements ConstraintProvider {
    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        return new Constraint[]{
                dropoffMustBeAfterPickup(constraintFactory)
//          , dropoffMustBeSameDriverAsPickup(constraintFactory)
        };
    }

    // ************************************************************************
    // Hard constraints
    // ************************************************************************

    /**
     * Constraint to express that a dropoff must happen after a pickup.
     * What this means is that the DestinationVisit must be _after_ the OriginVisit
     * in the chain, both belonging to the same order (orderId).
     *
     * @param factory The constraint factory provided by Optaplanner
     * @return The hard constraint
     */
    protected Constraint dropoffMustBeAfterPickup(ConstraintFactory factory) {
        return factory.from(PlanningVisit.class)
                .penalizeLong(
                        "dropoffMustBeAfterPickup",
                        HardMediumSoftLongScore.ONE_HARD,
                        PlanningVisit::dropoffAfterPickup
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

    protected Constraint dropoffMustBeSameDriverAsPickup(ConstraintFactory factory) {
        return factory.from(PlanningVisit.class)
                .join(PlanningVisit.class,
                        Joiners.equal(PlanningVisit::getPlanningDriver, PlanningVisit::getPlanningDriver),
                        Joiners.equal(PlanningVisit::getOrder, PlanningVisit::getOrder),
                        Joiners.lessThan(PlanningVisit::getPlanningId, PlanningVisit::getPlanningId)
                )
                .penalizeLong("dropoffMustBeSameDriverAsPickup",
                        HardMediumSoftLongScore.ONE_HARD,
                        (pv1, pv2) -> 1L);
    }


    // ************************************************************************
    // Soft constraints
    // ************************************************************************
}
