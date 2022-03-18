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

package dev.aws.proto.apps.instant.sequential.api;

import dev.aws.proto.apps.appcore.api.response.RequestResult;
import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.planner.solution.SolutionState;
import dev.aws.proto.apps.instant.sequential.Order;
import dev.aws.proto.apps.instant.sequential.api.request.DispatchRequest;
import dev.aws.proto.apps.instant.sequential.api.response.DispatchResult;
import dev.aws.proto.apps.instant.sequential.data.ApiDriver;
import dev.aws.proto.apps.instant.sequential.data.DdbAssignmentService;
import dev.aws.proto.apps.instant.sequential.data.DriverQueryManager;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDelivery;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.location.DestinationLocation;
import dev.aws.proto.apps.instant.sequential.location.OriginLocation;
import dev.aws.proto.apps.instant.sequential.planner.solution.DispatchSolution;
import dev.aws.proto.apps.instant.sequential.planner.solution.SolutionConsumer;
import dev.aws.proto.core.routing.config.RoutingConfig;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.LocationBase;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@ApplicationScoped
public class DispatchService extends dev.aws.proto.apps.appcore.api.DispatchService<Order, DispatchRequest, DispatchSolution> {
    private static final Logger logger = LoggerFactory.getLogger(DispatchService.class);

    @Inject
    DriverQueryManager driverQueryManager;

    @Inject
    DdbAssignmentService assignmentService;

    DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig, DriverQueryManager driverQueryManager) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.driverQueryManager = driverQueryManager;

        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());

        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    @Override
    public void solveDispatchProblem(UUID problemId, DispatchRequest req) {
        long createdAt = Timestamp.valueOf(LocalDateTime.now()).getTime();
        String executionId = req.getExecutionId();

        logger.trace("SolveDispatchProblem request :: problemId={} :: executionId={}", problemId, executionId);

        List<PlanningDelivery> planningDeliveries = new ArrayList<>();
        List<Coordinate> locationsForDriverQuery = new ArrayList<>();
        for (Order inputOrder : req.getOrders()) {
            locationsForDriverQuery.add(inputOrder.getOrigin());
        }

        logger.trace("Extracted {} locations for driver query", locationsForDriverQuery.size());

        List<PlanningDriver> drivers = driverQueryManager.retrieveDriversAroundLocations(locationsForDriverQuery, ApiDriver::convertToPlanningDriver);
//        List<PlanningDriver> drivers = driverQueryManager.retrieveDriversWithExtendingRadius(req.getCentroid(), req.getOrders().length, ApiDriver::convertToPlanningDriver);
        logger.trace("{} drivers retrieved from query", drivers.size());

        if (drivers.size() == 0) {
            logger.warn("0 drivers retrieved for executionId {} (problemId {})", executionId, problemId);
            RequestResult result = RequestResult.of(problemId.toString());
            result.setError("No drivers present in the system");

            List<String> unassignedOrderIds = Arrays.stream(req.getOrders()).map(Order::getOrderId).collect(Collectors.toList());
            assignmentService.saveAssignment(DispatchResult.builder()
                    .problemId(problemId)
                    .executionId(executionId)
                    .createdAt(createdAt)
                    .assigned(new ArrayList<>())
                    .unassigned(unassignedOrderIds)
                    .state("NO_DRIVERS")
                    .score("NA")
                    .build());

            return;
        }

        // TODO: fill out segments
        List<LocationBase> allLocations = new ArrayList<>();

        for (Order inputOrder : req.getOrders()) {
            OriginLocation originLocation = new OriginLocation(inputOrder.getOrigin().getId(), (Coordinate) inputOrder.getOrigin());
            DestinationLocation destinationLocation = new DestinationLocation(inputOrder.getDestination().getId(), (Coordinate) inputOrder.getDestination());

            PlanningDelivery delivery = new PlanningDelivery(inputOrder, originLocation, destinationLocation);
            planningDeliveries.add(delivery);

            allLocations.add(originLocation);
            allLocations.add(destinationLocation);
        }

        // save locations to _all_ locations
        drivers.forEach(d -> allLocations.add(d.getLocation()));

        assignmentService.saveAssignment(DispatchResult.builder()
                .problemId(problemId)
                .executionId(executionId)
                .createdAt(createdAt)
                .assigned(new ArrayList<>())
                .unassigned(new ArrayList<>())
                .state("ENQUEUED")
                .score("NA")
                .build());

        // build distance matrix
        DistanceMatrix distanceMatrix = DistanceMatrix.generate(allLocations, this.graphhopperRouter);
        logger.trace(distanceMatrix.toString());
        for (LocationBase loc : allLocations) {
            loc.setDistanceMatrix(distanceMatrix);
        }

        List<PlanningDriver> planningDrivers = drivers;

        DispatchSolution problem = new DispatchSolution(problemId, "DispatchingSolution", createdAt, executionId, planningDrivers, planningDeliveries);
//        SolverJob<DispatchingSolution, UUID> solverJob = this.solverManager.solveAndListen(problemId, this::problemFinder, this::consumeSolution);

        SolverJob<DispatchSolution, UUID> solverJob = this.solverManager.solve(problemId, super::problemFinder, this::finalBestSolutionConsumer);

        this.solutionMap.put(problemId, new SolutionState<>(solverJob, problem, System.currentTimeMillis()));
        assignmentService.saveAssignment(DispatchResult.builder()
                .problemId(problemId)
                .executionId(executionId)
                .createdAt(problem.getCreatedAt())
                .assigned(new ArrayList<>())
                .unassigned(new ArrayList<>())
                .state(solverJob.getSolverStatus().name())
                .score("")
                .build());
    }

    @Override
    protected void finalBestSolutionConsumer(DispatchSolution solution) {
        UUID problemId = solution.getId();

        SolverJob<DispatchSolution, UUID> solverJob = this.solutionMap.get(problemId).solverJob;
        long solverDurationInMs = solverJob.getSolvingDuration().getSeconds() * 1000 + (solverJob.getSolvingDuration().getNano() / 1_000_000);
        assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, SolverStatus.NOT_SOLVING, solverDurationInMs, false));
        SolutionConsumer.consumeSolution(solution);

        logger.debug("Removing problemId {} from solutionMap at consumeSolution", problemId);
        this.solutionMap.remove(problemId);
    }


    private void consumeSolution(DispatchSolution solution) {
        UUID problemId = solution.getId();

        assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, this.solverManager.getSolverStatus(problemId), true));
        SolutionConsumer.consumeSolution(solution);

        if (this.solverManager.getSolverStatus(problemId) == SolverStatus.NOT_SOLVING) {
            logger.debug("Removing problemId {} from solutionMap at consumeSolution", problemId);
            this.solutionMap.remove(problemId);
        }
    }

    public DispatchResult getSolutionStatus(UUID problemId) {
        // get from in-mem map
        SolutionState<DispatchSolution, UUID> state = this.solutionMap.get(problemId);

        // doesn't exist in mem cache
        if (state == null) {
            logger.debug(":: GetSolutionStatus :: problem not found ({})", problemId);
            DispatchResult assignment = assignmentService.getAssignment(problemId);
            return assignment;
        }

        SolverStatus solverStatus = state.solverJob.getSolverStatus();
        if (solverStatus == SolverStatus.NOT_SOLVING) {
            logger.info(":: Solution found :: problemId = {} :: returning and persisting result", problemId);
            try {
                DispatchSolution solution = state.solverJob.getFinalBestSolution();
                DispatchResult result = SolutionConsumer.buildResult(solution, solverStatus, false);
                logger.trace("Removing problemId {} from solutionMap", problemId);
                assignmentService.saveAssignment(SolutionConsumer.buildResult(solution, solverStatus, true));

                this.solutionMap.remove(problemId);
                return result;
            } catch (ExecutionException | InterruptedException e) {
                logger.error("Error while retrieving solution", e);
                return DispatchResult.builder()
                        .problemId(problemId)
                        .executionId(state.problem.getExecutionId())
                        .createdAt(state.problem.getCreatedAt())
                        .assigned(new ArrayList<>())
                        .unassigned(new ArrayList<>())
                        .state(solverStatus.name())
                        .score("")
                        .build();
            }
        } else {
            logger.debug(":: Problem still not solved :: problemId = {}", problemId);
            return DispatchResult.builder()
                    .problemId(problemId)
                    .executionId(state.problem.getExecutionId())
                    .createdAt(state.problem.getCreatedAt())
                    .assigned(new ArrayList<>())
                    .unassigned(new ArrayList<>())
                    .state(solverStatus.name())
                    .score("")
                    .build();
        }
    }
}
