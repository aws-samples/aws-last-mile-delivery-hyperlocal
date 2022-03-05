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
package dev.aws.proto.apps.instant.sequential.planner.solution;

import dev.aws.proto.apps.instant.sequential.Order;
import dev.aws.proto.apps.instant.sequential.api.response.DispatchResult;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDelivery;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.util.Constants;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.ILocation;
import dev.aws.proto.core.routing.location.LocationBase;
import dev.aws.proto.core.routing.route.DeliverySegment;
import dev.aws.proto.core.routing.route.SegmentRoute;
import org.optaplanner.core.api.solver.SolverStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.swing.text.Segment;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

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
                        dist.getTime() / 1000, dist.getDistance()
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
                .executionId(solution.getExecutionId())
                .createdAt(solution.getCreatedAt())
                .score(solution.getScore().toString())
                .state(solverStatus.name())
                .solverDurationInMs(solverDurationInMs)
                .build();

        List<PlanningDriver> drivers = solution.getPlanningDrivers();

        if (drivers.size() > 0) {
            DistanceMatrix distanceMatrix = drivers.get(0).getLocation().getDistanceMatrix();
            result.setDistanceMatrixMetrics(new DispatchResult.DistanceMatrixMetrics(distanceMatrix.getGeneratedTime(), distanceMatrix.dimension()));
        }

        List<DeliverySegment> assignedOrderSegments = new ArrayList<>();
        List<String> unassigned = new ArrayList<>();
        for (PlanningDriver driver : drivers) {
            PlanningDelivery delivery = driver.getNextPlanningDelivery();
            if (delivery == null && !includeEmptyDrivers) {
                continue;
            }

            // TODO: manually putting orders to unassigned if there are more than 2 assigned to a driver
            // because driver simulator at this point cannot handle more than one assigned order

            int segmentCtr = 0;
            LocationBase prevLocation = driver.getLocation();

            while (delivery != null) {
                // TODO: review and remove once simulator supports more than one order/driver
                if (segmentCtr > 2) {
                    unassigned.add(delivery.getOrder().getOrderId());
                } else {
                    assignedOrderSegments.add(
                            DeliverySegment.builder()
                                    .orderId(delivery.getOrder().getOrderId())
                                    .index(segmentCtr)
                                    .from(prevLocation.coordinate())
                                    .to(delivery.getPickup().coordinate())
                                    .segmentType(DeliverySegment.SegmentType.TO_ORIGIN)
                                    // TODO: points will be filled later
                                    .route((SegmentRoute) prevLocation.distanceTo(delivery.getPickup()))
                                    .build());

                    assignedOrderSegments.add(
                            DeliverySegment.builder()
                                    .orderId(delivery.getOrder().getOrderId())
                                    .index(segmentCtr+1)
                                    .from(delivery.getPickup().coordinate())
                                    .to(delivery.getDropoff().coordinate())
                                    .segmentType(DeliverySegment.SegmentType.TO_DESTINATION)
                                    .route((SegmentRoute) delivery.getPickup().distanceTo(delivery.getDropoff()))
                                    .build()
                    );

                    // refresh helper vars
                    prevLocation = delivery.getDropoff();
                    segmentCtr += 2;
                }
                delivery = delivery.getNextPlanningDelivery();
            }
        }

        result.setSegments(assignedOrderSegments);

        // currently we don't have a mechanism to keep orders unassigned
        result.setUnassigned(unassigned);

        return result;
    }
}