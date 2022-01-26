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
package com.aws.proto.dispatching.planner.solution.v1;

import com.aws.proto.dispatching.api.response.DispatcherResult;
import com.aws.proto.dispatching.domain.planningentity.base.Order;
import com.aws.proto.dispatching.domain.planningentity.v1.PlanningDriver;
import com.aws.proto.dispatching.domain.planningentity.v1.PlanningVisit;
import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDelivery;
import com.aws.proto.dispatching.util.Constants;
import org.optaplanner.core.api.solver.SolverStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

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

            PlanningVisit visit = driver.getNextPlanningVisit();
            if (visit == null) {
                logger.debug("\t-- NO visits assigned");
            }

            while (visit != null) {
                Order order = visit.getOrder();

                logger.debug("\t[visit={}]\t{}\tfor order[id={}][at={}]",
                  visit.getLocation().getLocationType(), visit.getLocation().getCoordinates(),
                  order.getOrderId(), order.getDateTime().format(Constants.DATETIMEFORMATTER)
                );
                visit = visit.getNextPlanningVisit();
            }
        });
    }

    public static DispatcherResult buildResult(DispatchingSolution solution, SolverStatus solverStatus) {
        DispatcherResult result = new DispatcherResult();

        result.problemId = solution.getId();
        result.score = solution.getScore().toString();
        result.state = solverStatus.name();

        List<PlanningDriver> drivers = solution.getPlanningDrivers();

        List<DispatcherResult.AssignedOrders> assignedOrders = new ArrayList<>();
        for(PlanningDriver driver : drivers) {
            List<String> orderIds = new ArrayList<>();
            List<DispatcherResult.Visit> visits = new ArrayList<>();

            PlanningVisit visit = driver.getNextPlanningVisit();
            if(visit == null) {
                continue;
            }

            while(visit != null) {
                orderIds.add(visit.getOrder().getOrderId());
                visits.add(new DispatcherResult.Visit(visit.getLocation()));

                visit = visit.getNextPlanningVisit();
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
        result.unassigned = new ArrayList<>();

        return result;
    }
}
