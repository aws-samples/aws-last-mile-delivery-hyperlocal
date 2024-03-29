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
package dev.aws.proto.apps.instant.sequential.planner.solution;

import dev.aws.proto.apps.appcore.api.response.DeliverySegment;
import dev.aws.proto.apps.appcore.api.response.Segment;
import dev.aws.proto.apps.instant.sequential.Order;
import dev.aws.proto.apps.instant.sequential.api.response.DispatchResult;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDelivery;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.location.Location;
import dev.aws.proto.apps.instant.sequential.util.Constants;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import org.optaplanner.core.api.solver.SolverStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility class to transform the dispatch solution.
 */
public class SolutionConsumer {
    private static final Logger logger = LoggerFactory.getLogger(SolutionConsumer.class);

    public static void consumeSolution(DispatchSolution solution) {
        logger.debug("[{}] Solution Score: {}", solution.getId(), solution.getScore());

        solution.getPlanningDrivers().forEach((PlanningDriver driver) -> {

            logger.debug("driver[{}] :: location {} :: at [{}]",
                    driver.getId(),
                    driver.getLocation().getCoordinate(),
                    driver.getLocation().getDateTime().format(Constants.DATETIMEFORMATTER)
            );

            PlanningDelivery planningDelivery = driver.getNextPlanningDelivery();
            if (planningDelivery == null) {
                logger.debug("\t-- NO visits assigned");
            }

            while (planningDelivery != null) {
                Order order = planningDelivery.getOrder();
                Distance dist = planningDelivery.getDistanceFromPrevDriverOrDelivery();

                logger.debug("\torder[id={}][at={}] [distance from prev = {}s/{}m]",
                        order.getOrderId(), Instant.ofEpochMilli(order.getCreatedAt()).atZone(ZoneId.systemDefault()).toLocalDateTime().format(Constants.DATETIMEFORMATTER),
                        dist.getDistanceInSeconds(), dist.getDistanceInMeters()
                );
                planningDelivery = planningDelivery.getNextPlanningDelivery();
            }
        });
    }

    public static DispatchResult buildResult(DispatchSolution solution, SolverStatus solverStatus, boolean includeEmptyDrivers) {
        return buildResult(solution, solverStatus, -1, includeEmptyDrivers);
    }

    public static DispatchResult buildResult(DispatchSolution solution, SolverStatus solverStatus, long solverDurationInMs, boolean includeEmptyDrivers) {
        DispatchResult result = DispatchResult.builder()
                .problemId(solution.getId())
                .createdAt(solution.getCreatedAt())
                .score(solution.getScore().toString())
                .solverDurationInMs(solverDurationInMs)
                .state(solverStatus.name())
                .executionId(solution.getExecutionId())
                .build();

        List<PlanningDriver> drivers = solution.getPlanningDrivers();

        if (drivers.size() > 0) {
            DistanceMatrix distanceMatrix = (DistanceMatrix) drivers.get(0).getLocation().getDistanceMatrix();
            result.setDistanceMatrixMetrics(distanceMatrix.getMetrics());
        }

        List<DispatchResult.Assignment> assigned = new ArrayList<>();
        List<String> unassigned = new ArrayList<>();

        for (PlanningDriver driver : drivers) {
            List<DeliverySegment> assignedOrderSegments = new ArrayList<>();
            PlanningDelivery delivery = driver.getNextPlanningDelivery();
            if (delivery == null && !includeEmptyDrivers) {
                continue;
            }

            // TODO: manually putting orders to unassigned if there are more than 2 assigned to a driver
            // because driver simulator at this point cannot handle more than one assigned order

            // TODO: review how segmets are assembled. if multiple drivers are involved this may not be the proper solution

            int segmentCtr = 0;
            Location prevLocation = driver.getLocation();

            while (delivery != null) {
                // TODO: review and remove once simulator supports more than one order/driver
                if (segmentCtr > 2) {
                    unassigned.add(delivery.getOrder().getOrderId());
                } else {

                    DeliverySegment segmentToOrigin = DeliverySegment.builder()
                            .orderId(delivery.getOrder().getOrderId())
                            .index(segmentCtr)
                            .from(prevLocation.getCoordinate())
                            .to(delivery.getPickup().getCoordinate())
                            .segmentType(DeliverySegment.SegmentType.TO_ORIGIN)
                            .route(Segment.between(prevLocation, delivery.getPickup()))
                            .build();

                    DeliverySegment segmentToDestination = DeliverySegment.builder()
                            .orderId(delivery.getOrder().getOrderId())
                            .index(segmentCtr + 1)
                            .from(delivery.getPickup().getCoordinate())
                            .to(delivery.getDropoff().getCoordinate())
                            .segmentType(DeliverySegment.SegmentType.TO_DESTINATION)
                            .route(Segment.between(delivery.getPickup(), delivery.getDropoff()))
                            .build();

                    assignedOrderSegments.add(segmentToOrigin);
                    assignedOrderSegments.add(segmentToDestination);

                    // refresh helper vars
                    prevLocation = delivery.getDropoff();
                    segmentCtr += 2;
                }
                delivery = delivery.getNextPlanningDelivery();
            }

            DispatchResult.Assignment driverAssignment = DispatchResult.Assignment.builder()
                    .driverId(driver.getId())
                    .driverIdentity(driver.getDriverIdentity())
                    .segments(assignedOrderSegments)
                    .route(Segment.fromSegments(assignedOrderSegments))
                    .build();
            assigned.add(driverAssignment);
        }

        result.setAssigned(assigned);
        // currently we don't have a mechanism to keep orders unassigned
        result.setUnassigned(unassigned);

        return result;
    }
}
