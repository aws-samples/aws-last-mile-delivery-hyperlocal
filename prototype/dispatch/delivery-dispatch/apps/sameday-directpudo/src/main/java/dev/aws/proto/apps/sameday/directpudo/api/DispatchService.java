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

package dev.aws.proto.apps.sameday.directpudo.api;

import dev.aws.proto.apps.appcore.config.DistanceCachingConfig;
import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.planner.solution.SolutionState;
import dev.aws.proto.apps.sameday.directpudo.Order;
import dev.aws.proto.apps.sameday.directpudo.api.request.DispatchRequest;
import dev.aws.proto.apps.sameday.directpudo.api.response.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJobWithDeliveryJobs;
import dev.aws.proto.apps.sameday.directpudo.data.DdbDeliveryJobService;
import dev.aws.proto.apps.sameday.directpudo.data.DdbHubService;
import dev.aws.proto.apps.sameday.directpudo.data.DdbSolverJobService;
import dev.aws.proto.apps.sameday.directpudo.data.Parcel;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.DeliveryRide;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningHub;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVehicle;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.CurrentCapacity;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.MaxCapacity;
import dev.aws.proto.apps.sameday.directpudo.location.DropoffLocation;
import dev.aws.proto.apps.sameday.directpudo.location.HubLocation;
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import dev.aws.proto.apps.sameday.directpudo.location.PickupLocation;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.SolutionConsumer;
import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.H3DistanceMatrix;
import dev.aws.proto.core.routing.cache.persistence.ICachePersistence;
import dev.aws.proto.core.routing.config.RoutingConfig;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
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

/**
 * The concrete implementation of the dispatch service for the sameday-directpudo delivery domain.
 */
@ApplicationScoped
public class DispatchService extends dev.aws.proto.apps.appcore.api.DispatchService<Order, DispatchRequest, DispatchSolution> {
    private static final Logger logger = LoggerFactory.getLogger(DispatchService.class);

//    @Inject
//    DriverQueryManager driverQueryManager;

    @Inject
    DdbDeliveryJobService deliveryJobService;

    @Inject
    DdbSolverJobService solverJobService;

    @Inject
    DdbHubService hubService;

    @Inject
    DistanceCachingConfig distanceCachingConfig;

    private H3DistanceCache h3DistanceCache;

    DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig, DistanceCachingConfig distanceCachingConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.distanceCachingConfig = distanceCachingConfig;

        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper(), routingConfig.routingProfile());
        ICachePersistence distanceMatrixPersistence = distanceCachingConfig.getCachePersistence();
        this.h3DistanceCache = distanceMatrixPersistence.importCache();

        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    /**
     * TODO: reminder -- we can query drivers and do geoclustering on them, use clusters' centroids as
     * "depot location" without using depot concept per se
     *
     * @param problemId The generated ID for the problem.
     * @param req       The dispatch request object.
     */
    @Override
    public void solveDispatchProblem(UUID problemId, DispatchRequest req) {
        long createdAt = Timestamp.valueOf(LocalDateTime.now()).getTime();
        String executionId = req.getExecutionId();
        logger.info("SolveDispatchProblem request :: problemId={} :: executionId={}", problemId, executionId);

        logger.trace("Pulling hubs information");
        List<PlanningHub> hubs = hubService.listHubs();

        logger.trace("Extracting locations from request orders and hubs");
        List<Location> allLocations = new ArrayList<>();
        Map<String, Location> pickupLocations = new HashMap<>();
        Map<String, Location> dropoffLocations = new HashMap<>();

        for (PlanningHub hub : hubs) {
            allLocations.add(new HubLocation(hub.getId(), hub.getCoordinate()));
        }

        for (Order o : req.getOrders()) {
            PickupLocation pickup = new PickupLocation(o.getOrigin().getId(), (Coordinate) o.getOrigin());
            allLocations.add(pickup);

            DropoffLocation dropoff = new DropoffLocation(o.getDestination().getId(), (Coordinate) o.getDestination());
            allLocations.add(dropoff);

            pickupLocations.put(o.getOrderId(), pickup);
            dropoffLocations.put(o.getOrderId(), dropoff);
        }

        List<PlanningVisit> planningVisits = new ArrayList<>();
        List<DeliveryRide> rides = new ArrayList<>();
        long rideId = 0;
        for (Order o : req.getOrders()) {
            String orderId = o.getOrderId();

            PlanningVisit pickupVisit = new PlanningVisit();
            pickupVisit.setId(pickupLocations.get(orderId).getId());
            pickupVisit.setOrderId(orderId);
            pickupVisit.setVisitType(PlanningVisit.VisitType.PICKUP);
            pickupVisit.setLocation(pickupLocations.get(orderId));

            PlanningVisit dropoffVisit = new PlanningVisit();
            dropoffVisit.setId(dropoffLocations.get(orderId).getId());
            dropoffVisit.setOrderId(orderId);
            dropoffVisit.setVisitType(PlanningVisit.VisitType.DROPOFF);
            dropoffVisit.setLocation(dropoffLocations.get(orderId));

            Parcel orderParcel = o.getPayload().getParcel();

            rideId++;
            DeliveryRide ride = new DeliveryRide();
            ride.setId(rideId);
            ride.setOrderId(orderId);
            ride.setPickupVisit(pickupVisit);
            ride.setDropoffVisit(dropoffVisit);
            ride.setParcel(orderParcel);

            pickupVisit.setRide(ride);
            dropoffVisit.setRide(ride);

            planningVisits.add(pickupVisit);
            planningVisits.add(dropoffVisit);
            rides.add(ride);
        }

        // TODO: create vehicles from hubs information
        List<PlanningVehicle> mockVehicles = new ArrayList<>();
        Random rnd = new Random();
        for (int i = 0; i < 5; i++) {
            PlanningVehicle vehicle = new PlanningVehicle();
            vehicle.setMaxCapacity(MaxCapacity.MOTORBIKE);
            vehicle.setCurrentCapacity(CurrentCapacity.ZERO);
            HubLocation vehicleLocation = new HubLocation("MOCK_ID_" + i, hubs.get(rnd.nextInt(hubs.size())).getCoordinate());
            vehicle.setLocation(vehicleLocation);
            vehicle.setId("MOCK_ID_" + i);

            allLocations.add(vehicleLocation);
            mockVehicles.add(vehicle);
        }

        logger.debug("Starting to generate a distance matrix with {} locations extracted from the request.", allLocations.size());

        H3DistanceMatrix<Location> h3DistanceMatrix = H3DistanceMatrix.generate(this.h3DistanceCache, allLocations);

        for (Location loc : allLocations) {
            loc.setDistanceMatrix(h3DistanceMatrix);
        }

        DispatchSolution realProblem = DispatchSolution.builder()
                .id(problemId)
                .name("SameDayDirectPudoSolution")
                .createdAt(createdAt)
                .executionId(executionId)
                .score(HardMediumSoftLongScore.ZERO)
                .locations(allLocations)
                .planningVisits(planningVisits)
                .planningVehicles(mockVehicles)
                .rides(rides)
                .hubs(hubs)
                .build();

        org.optaplanner.core.api.solver.SolverJob<DispatchSolution, UUID> optaSolverJob = this.solverManager.solve(problemId, super::problemFinder, this::finalBestSolutionConsumer);
        this.solutionMap.put(problemId, new SolutionState<>(optaSolverJob, realProblem, System.currentTimeMillis()));
    }

    @Override
    protected void finalBestSolutionConsumerHook(DispatchSolution dispatchSolution, long solverDurationInMs) {
        logger.debug("[{}ms] :: finalBestSolutionConsumerHook :: {}", solverDurationInMs, dispatchSolution);
        SolutionConsumer.logSolution(dispatchSolution);

        try {
            List<DeliveryJob> deliveryJobs = SolutionConsumer.extractDeliveryJobs(dispatchSolution, graphhopperRouter);
            deliveryJobService.saveJobsForSolverJobId(dispatchSolution.getId(), deliveryJobs);
        } catch (Exception e) {
            logger.error("Saving deliveryJobs for solverJobId {} failed: {}", dispatchSolution.getId(), e.getMessage());
            e.printStackTrace();
        }

        try {
            SolverJob solverJob = SolutionConsumer.extractSolverJob(dispatchSolution, SolverStatus.NOT_SOLVING, solverDurationInMs);
            solverJobService.save(solverJob);
        } catch (Exception e) {
            logger.error("Saving solverjob failed: {}", e.getMessage());
            e.printStackTrace();
        }
    }

    public SolverJobWithDeliveryJobs getSolutionStatus(UUID problemId) {
        logger.debug("Getting solution status for id {}", problemId);

        SolverJob solverJob = solverJobService.getItem(problemId);
        if (solverJob == null) {
            logger.debug("No solverJob found with ID {}", problemId);
            return null;
        }

        List<DeliveryJob> deliveryJobs = deliveryJobService.retrieveDeliveryJobsForSolverJobId(problemId);

        SolverJobWithDeliveryJobs result = SolverJobWithDeliveryJobs.builder()
                .problemId(solverJob.getProblemId())
                .createdAt(solverJob.getCreatedAt())
                .score(solverJob.getScore())
                .solverDurationInMs(solverJob.getSolverDurationInMs())
                .state(solverJob.getState())
                .executionId(solverJob.getExecutionId())
                .deliveryJobs(deliveryJobs)
                .build();

        return result;
    }

    public void saveInitialEnqueued(UUID problemId, DispatchRequest req) {
        solverJobService.save(SolverJob.builder()
                .problemId(problemId)
                .executionId(req.getExecutionId())
                .createdAt(Timestamp.valueOf(LocalDateTime.now()).getTime())
                .state("ENQUEUED")
                .score("NA")
                .build());
    }
}
