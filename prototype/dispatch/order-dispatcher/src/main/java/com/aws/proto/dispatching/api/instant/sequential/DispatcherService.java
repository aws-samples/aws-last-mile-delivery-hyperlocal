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
package com.aws.proto.dispatching.api.instant.sequential;

import com.aws.proto.dispatching.api.request.AssignDriversRequest;
import com.aws.proto.dispatching.api.response.DispatcherRequestResult;
import com.aws.proto.dispatching.api.response.DispatcherResult;
import com.aws.proto.dispatching.config.RoutingConfig;
import com.aws.proto.dispatching.config.SolutionConfig;
import com.aws.proto.dispatching.data.DriverQueryManager;
import com.aws.proto.dispatching.data.ddb.DdbAssignmentService;
import com.aws.proto.dispatching.data.ddb.DdbDemographicAreaSettingsService;
import com.aws.proto.dispatching.domain.location.DestinationLocation;
import com.aws.proto.dispatching.domain.location.LocationBase;
import com.aws.proto.dispatching.domain.location.OriginLocation;
import com.aws.proto.dispatching.domain.planningentity.base.Order;
import com.aws.proto.dispatching.domain.planningentity.base.PlanningDriverBase;
import com.aws.proto.dispatching.domain.planningentity.instant.sequential.PlanningDelivery;
import com.aws.proto.dispatching.domain.planningentity.instant.sequential.PlanningDriver;
import com.aws.proto.dispatching.planner.solution.SolutionState;
import com.aws.proto.dispatching.planner.solution.instant.sequential.DispatchingSolution;
import com.aws.proto.dispatching.planner.solution.instant.sequential.SolutionConsumer;
import com.aws.proto.dispatching.routing.Coordinates;
import com.aws.proto.dispatching.routing.DistanceMatrix;
import com.aws.proto.dispatching.routing.GraphhopperRouter;
import org.optaplanner.core.api.solver.SolverJob;
import org.optaplanner.core.api.solver.SolverManager;
import org.optaplanner.core.api.solver.SolverStatus;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.SolverManagerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@ApplicationScoped
public class DispatcherService {
    private static final Logger logger = LoggerFactory.getLogger(DispatcherService.class);

    @Inject
    RoutingConfig routingConfig;

    @Inject
    SolutionConfig solutionConfig;

    SolverManager<DispatchingSolution, UUID> solverManager;
    private final Map<UUID, SolutionState<DispatchingSolution, UUID>> solutionMap;

    @Inject
    DriverQueryManager driverQueryManager;

    @Inject
    DdbDemographicAreaSettingsService demAreaService;

    @Inject
    DdbAssignmentService assignmentService;

    GraphhopperRouter graphhopperRouter;

    DispatcherService(RoutingConfig routingConfig, SolutionConfig solutionConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());

        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
//        SolverFactory<DispatchingSolution> solverFactory = SolverFactory.create(solverConfig);
//        this.solverManager = new DefaultSolverManager<>(solverFactory, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    public void assignDrivers(UUID problemId, AssignDriversRequest req) {
        long createdAt = Timestamp.valueOf(LocalDateTime.now()).getTime();
        String executionId = req.executionId;

        List<PlanningDelivery> planningDeliveries = new ArrayList<>();

        List<Coordinates> locationsForDriverQuery = new ArrayList<>();
        for (AssignDriversRequest.Order inputOrder : req.orders) {
            locationsForDriverQuery.add(Coordinates.valueOf(inputOrder.origin.lat, inputOrder.origin.lon));
        }

        List<PlanningDriverBase> drivers = driverQueryManager.retrieveDriversAroundLocations(locationsForDriverQuery);
//        List<PlanningDriverBase> drivers = driverQueryManager.retrieveDriversWithExtendingRadius(
//          Coordinates.valueOf(req.centroid.lat, req.centroid.lon), req.orders.length);

        if (drivers.size() == 0) {
            DispatcherRequestResult result = new DispatcherRequestResult(problemId.toString());
            result.error = "No drivers present in the system";

            List<String> unassignedOrderIds = Arrays.stream(req.orders).map(o -> o.orderId).collect(Collectors.toList());
            assignmentService.saveAssignment(new DispatcherResult(problemId, executionId, createdAt, new ArrayList<>(), unassignedOrderIds, "NO_DRIVERS", "NA"));

            return;
        }

        List<LocationBase> allLocations = new ArrayList<>();

        for (AssignDriversRequest.Order inputOrder : req.orders) {
            Order order = new Order(inputOrder.orderId, inputOrder.createdAt, inputOrder.state, inputOrder.origin.preparationTimeInMins);
            OriginLocation originLocation = new OriginLocation(inputOrder.origin.id, Coordinates.valueOf(inputOrder.origin.lat, inputOrder.origin.lon));
            DestinationLocation destinationLocation = new DestinationLocation(inputOrder.destination.id, Coordinates.valueOf(inputOrder.destination.lat, inputOrder.destination.lon));

            PlanningDelivery delivery = new PlanningDelivery(order, originLocation, destinationLocation);
            planningDeliveries.add(delivery);

            allLocations.add(originLocation);
            allLocations.add(destinationLocation);
        }

        // save locations to _all_ locations
        drivers.forEach(d -> allLocations.add(d.getLocation()));

        assignmentService.saveAssignment(new DispatcherResult(problemId, executionId, createdAt, new ArrayList<>(), new ArrayList<>(), "ENQUEUED", "NA"));

        // build distance matrix
        DistanceMatrix distanceMatrix = DistanceMatrix.generate(allLocations, this.graphhopperRouter);
        logger.trace(distanceMatrix.toString());
        for (LocationBase loc : allLocations) {
            loc.setDistanceMatrix(distanceMatrix);
        }

        List<PlanningDriver> planningDrivers = drivers.stream().map(PlanningDriver::new).collect(Collectors.toList());

        DispatchingSolution problem = new DispatchingSolution(problemId, "DispatchingSolution", createdAt, executionId, planningDrivers, planningDeliveries);
//        SolverJob<DispatchingSolution, UUID> solverJob = this.solverManager.solveAndListen(problemId, this::problemFinder, this::consumeSolution);

        SolverJob<DispatchingSolution, UUID> solverJob = this.solverManager.solve(problemId, this::problemFinder, this::finalBestSolutionConsumer);

        this.solutionMap.put(problemId, new SolutionState<>(solverJob, problem, System.currentTimeMillis()));
        assignmentService.saveAssignment(new DispatcherResult(problemId, executionId, problem.getCreatedAt(), solverJob.getSolverStatus()));
    }

    private void finalBestSolutionConsumer(DispatchingSolution solution) {
        UUID problemId = solution.getId();

        SolverJob<DispatchingSolution, UUID> solverJob = this.solutionMap.get(problemId).solverJob;
        long solverDurationInMs = solverJob.getSolvingDuration().getSeconds() * 1000 + (solverJob.getSolvingDuration().getNano() / 1_000_000);
        assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, SolverStatus.NOT_SOLVING, solverDurationInMs, true));
        SolutionConsumer.consumeSolution(solution);

        logger.debug("Removing problemId {} from solutionMap at consumeSolution", problemId);
        this.solutionMap.remove(problemId);
    }

    DispatchingSolution problemFinder(UUID problemId) {
        return this.solutionMap.get(problemId).problem;
    }

    private void consumeSolution(DispatchingSolution solution) {
        UUID problemId = solution.getId();

        assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, this.solverManager.getSolverStatus(problemId), true));
        SolutionConsumer.consumeSolution(solution);

        if (this.solverManager.getSolverStatus(problemId) == SolverStatus.NOT_SOLVING) {
            logger.debug("Removing problemId {} from solutionMap at consumeSolution", problemId);
            this.solutionMap.remove(problemId);
        }
    }

    public DispatcherResult getSolutionStatus(UUID problemId) {
        // get from in-mem map
        SolutionState<DispatchingSolution, UUID> state = this.solutionMap.get(problemId);

        // doesn't exist in mem cache
        if (state == null) {
            logger.debug(":: GetSolutionStatus :: problem not found ({})", problemId);
            DispatcherResult assignment = assignmentService.getAssignment(problemId);
            return assignment;
        }

        SolverStatus solverStatus = state.solverJob.getSolverStatus();
        if (solverStatus == SolverStatus.NOT_SOLVING) {
            logger.info(":: Solution found :: problemId = {} :: returning and persisting result result", problemId);
            try {
                DispatchingSolution solution = state.solverJob.getFinalBestSolution();
                DispatcherResult result = SolutionConsumer.buildResult(solution, solverStatus, false);
                logger.trace("Removing problemId {} from solutionMap", problemId);
                assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, solverStatus, true));

                this.solutionMap.remove(problemId);
                return result;
            } catch (ExecutionException | InterruptedException e) {
                logger.error("Error while retrieving solution", e);
                return new DispatcherResult(problemId, state.problem.getExecutionId(), state.problem.getCreatedAt(), solverStatus);
            }
        } else {
            logger.debug(":: Problem still not solved :: problemId = {}", problemId);
            return new DispatcherResult(problemId, state.problem.getExecutionId(), state.problem.getCreatedAt(), solverStatus);
        }
    }

}
