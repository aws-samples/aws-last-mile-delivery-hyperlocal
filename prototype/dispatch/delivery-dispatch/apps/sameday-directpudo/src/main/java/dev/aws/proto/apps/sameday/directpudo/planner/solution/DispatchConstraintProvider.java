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

package dev.aws.proto.apps.sameday.directpudo.planner.solution;

import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVehicle;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
import org.optaplanner.core.api.score.stream.Constraint;
import org.optaplanner.core.api.score.stream.ConstraintFactory;
import org.optaplanner.core.api.score.stream.ConstraintProvider;
import org.optaplanner.core.api.score.stream.Joiners;

import static org.optaplanner.core.api.score.stream.ConstraintCollectors.count;

public class DispatchConstraintProvider implements ConstraintProvider {

    /**
     * We define the constraints here.
     * <p>
     * IMPORTANT to note, that the outcome will depend on the _order_ of the constraints in this list - at least that are on the same "level".
     * <p>
     * Check out the docs for constraint steams here: {@see https://www.optaplanner.org/docs/optaplanner/latest/constraint-streams/constraint-streams.html}
     */
    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        return new Constraint[]{
                limitVisitsPerVehicle(constraintFactory),
                vehicleCapacityMedium(constraintFactory),
                pickupAndDropoffBySameVehicle(constraintFactory),
                pickupBeforeDropoff(constraintFactory),
                distanceToPreviousVisitOrVehicle(constraintFactory),
                distanceFromLastVisitToHub(constraintFactory),

                // not used ATM
                // limitDeliveryJobToMaxDuration(constraintFactory),
        };
    }

    protected Constraint pickupAndDropoffBySameVehicle(ConstraintFactory factory) {
        return factory.forEach(PlanningVisit.class)
                .join(PlanningVisit.class,
                        // same orderId (aka same ride)
                        Joiners.equal(PlanningVisit::getOrderId, PlanningVisit::getOrderId),
                        // left: pickup, right: dropoff
                        Joiners.lessThan(PlanningVisit::getVisitType, PlanningVisit::getVisitType),
                        // different vehicles
                        Joiners.filtering((pickup, dropoff) -> !pickup.getPlanningVehicleId().equalsIgnoreCase(dropoff.getPlanningVehicleId()))
                )
                .penalize("Pickup and dropoff by the same vehicle", HardMediumSoftLongScore.ONE_HARD);
    }

    protected Constraint pickupBeforeDropoff(ConstraintFactory factory) {
        return factory.forEach(PlanningVisit.class)
                .join(PlanningVisit.class,
                        // same orderId (aka same ride)
                        Joiners.equal(PlanningVisit::getOrderId, PlanningVisit::getOrderId),
                        // pickup < dropoff based on ordinal in enum (see Enum.compareTo)
                        // --> meaning that the left item is pickup, right item is dropoff
                        Joiners.lessThan(PlanningVisit::getVisitType, PlanningVisit::getVisitType),
                        // here comes the fun:
                        // pickup.visitIdx > dropoff.visitIdx --> pickup is later than dropoff
                        Joiners.greaterThan(PlanningVisit::getVisitIndex, PlanningVisit::getVisitIndex)
                )
                .penalize(
                        "Pickup before dropoff",
                        HardMediumSoftLongScore.ONE_HARD,
                        (pickup, dropoff) -> (pickup.getVisitIndex() - dropoff.getVisitIndex())
                );
    }

    protected Constraint distanceToPreviousVisitOrVehicle(ConstraintFactory factory) {
        return factory.forEach(PlanningVisit.class)
                .penalize("Distance to previous visit or vehicle",
                        HardMediumSoftLongScore.ONE_MEDIUM,
                        PlanningVisit::scoreForDistanceFromPreviousVisitOrVehicle
                );
    }

    protected Constraint distanceFromLastVisitToHub(ConstraintFactory factory) {
        return factory.forEach(PlanningVisit.class)
                .filter(PlanningVisit::isLastVisit)
                .penalize("Distance from last visit back to hub",
                        HardMediumSoftLongScore.ONE_MEDIUM,
                        PlanningVisit::scoreForDistanceFromLastVisitToHub
                );
    }

    protected Constraint limitDeliveryJobToMaxDuration(ConstraintFactory factory) {
        return factory.forEach(PlanningVehicle.class)
                .penalize("Limit max duration of a delivery job",
                        HardMediumSoftLongScore.ONE_HARD,
                        PlanningVehicle::scoreForDeliveryJobMaxDuration
                );
    }

    protected Constraint vehicleCapacity(ConstraintFactory factory) {
        return factory.forEach(PlanningVehicle.class)
                .penalize(
                        "Vehicle capacity - HARD score",
                        HardMediumSoftLongScore.ONE_HARD,
                        PlanningVehicle::scoreForCapacityViolationHard
                );
    }

    protected Constraint vehicleCapacityMedium(ConstraintFactory factory) {
        return factory.forEach(PlanningVehicle.class)
                .penalize(
                        "Vehicle capacity - MEDIUM/SOFT score",
                        HardMediumSoftLongScore.ONE_SOFT,
                        PlanningVehicle::scoreForCapacityViolationMedium
                );
    }

    protected Constraint limitVisitsPerVehicle(ConstraintFactory factory) {
        return factory.forEach(PlanningVisit.class)
                // create the groups per vehicle, the collector is the count() method
                .groupBy(PlanningVisit::getPlanningVehicle, count())
                // pick those that have more than N visits
                .filter((visit, visitCount) -> visitCount > 20)
                // and penalize them
                .penalize(
                        "Limit the number of visits per vehicle",
                        HardMediumSoftLongScore.ONE_HARD
                );
    }
}
