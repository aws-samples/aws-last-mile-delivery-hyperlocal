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

import com.aws.proto.dispatching.api.response.DispatcherResult;
import com.aws.proto.dispatching.domain.planningentity.base.Order;
import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDelivery;
import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDriver;
import com.aws.proto.dispatching.planner.solution.v2.DispatchingSolution;
import com.aws.proto.dispatching.routing.Distance;
import com.aws.proto.dispatching.routing.DistanceMatrix;
import com.aws.proto.dispatching.util.Constants;
import org.optaplanner.core.api.solver.SolverJob;
import org.optaplanner.core.api.solver.SolverStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

public class SolutionConsumer {
    private static final Logger logger = LoggerFactory.getLogger(SolutionConsumer.class);

    public static void consumeSolution(DispatchingSolution solution) {
        logger.debug("[{}] Solution Score: {}", solution.getId(), solution.getScore());

        solution.getPlanningDrivers().stream().forEach(driver -> {

            logger.debug("driver[{}] :: location {} :: at [{}]",
              driver.getId(),
              driver.getLocation().getCoordinates(),
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
                  order.getOrderId(), order.getDateTime().format(Constants.DATETIMEFORMATTER),
                  dist.getTime()/1000, dist.getDistance()
                );
                planningDelivery = planningDelivery.getNextPlanningDelivery();
            }
        });
    }

    public static DispatcherResult buildResult(DispatchingSolution solution, SolverStatus solverStatus, boolean includeEmptyDrivers) {
        return buildResult(solution, solverStatus, -1, includeEmptyDrivers);
    }

    public static DispatcherResult buildResult(DispatchingSolution solution, SolverStatus solverStatus, long solverDurationInMs, boolean includeEmptyDrivers) {
        DispatcherResult result = new DispatcherResult();

        result.problemId = solution.getId();
        result.executionId = solution.getExecutionId();
        result.createdAt = solution.getCreatedAt();
        result.score = solution.getScore().toString();
        result.state = solverStatus.name();
        result.solverDurationInMs = solverDurationInMs;

        List<PlanningDriver> drivers = solution.getPlanningDrivers();

        if(drivers.size() > 0) {
            DistanceMatrix distanceMatrix = drivers.get(0).getLocation().getDistanceMatrix();
            result.distanceMatrixMetrics = new DispatcherResult.DistanceMatrixMetrics(distanceMatrix.getGeneratedTime(), distanceMatrix.dimension());
        }

        List<DispatcherResult.AssignedOrders> assignedOrders = new ArrayList<>();
        List<String> unassigned = new ArrayList<>();
        for(PlanningDriver driver : drivers) {
            List<String> orderIds = new ArrayList<>();
            List<DispatcherResult.Visit> visits = new ArrayList<>();

            PlanningDelivery delivery = driver.getNextPlanningDelivery();
            if (delivery == null && !includeEmptyDrivers) {
                continue;
            }
            // TODO: manually putting orders to unassigned if there are more than 2 assigned to a driver
            // because driver simulator at this point cannot handle more than one assigned order
            int ctr = 0;
            while(delivery != null) {
                ctr++;
                if (ctr > 1) {
                    unassigned.add(delivery.getOrder().getOrderId());
                } else {
                    orderIds.add(delivery.getOrder().getOrderId());
                    visits.add(new DispatcherResult.Visit(delivery.getPickup()));
                    visits.add(new DispatcherResult.Visit(delivery.getDropoff()));
                }
                delivery = delivery.getNextPlanningDelivery();
            }

            assignedOrders.add(new DispatcherResult.AssignedOrders(
              driver.getId(),
              driver.getDriverIdentity(),
              driver.getLocation(),
              orderIds,
              visits
            ));
        }


        result.assigned = assignedOrders;
        // currently we don't have a mechanism to keep orders unassigned
        result.unassigned = unassigned;

        return result;
    }
}
