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

import com.uber.h3core.H3Core;
import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.planner.solution.SolutionState;
import dev.aws.proto.apps.sameday.directpudo.Order;
import dev.aws.proto.apps.sameday.directpudo.api.request.DispatchRequest;
import dev.aws.proto.apps.sameday.directpudo.api.response.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJobWithDeliveryJobs;
import dev.aws.proto.apps.sameday.directpudo.config.DistanceCachingConfig;
import dev.aws.proto.apps.sameday.directpudo.data.*;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.DeliveryRide;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningHub;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVehicle;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.CurrentCapacity;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.MaxCapacity;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.VehicleType;
import dev.aws.proto.apps.sameday.directpudo.location.DropoffLocation;
import dev.aws.proto.apps.sameday.directpudo.location.HubLocation;
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import dev.aws.proto.apps.sameday.directpudo.location.PickupLocation;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.SolutionConsumer;
import dev.aws.proto.core.routing.H3;
import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.H3DistanceMatrix;
import dev.aws.proto.core.routing.cache.persistence.ICachePersistence;
import dev.aws.proto.core.routing.config.RoutingConfig;
import dev.aws.proto.core.routing.distance.TravelDistance;
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
    DdbVehicleCapacityService vehicleCapacityService;

    @Inject
    DistanceCachingConfig distanceCachingConfig;

    private H3DistanceCache h3DistanceCache;

    DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig, DistanceCachingConfig distanceCachingConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.distanceCachingConfig = distanceCachingConfig;

        // instantiate the graphhopper router
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper(), routingConfig.routingProfile());

        // instantiate distance cache
        ICachePersistence<H3DistanceCache> distanceMatrixPersistence = distanceCachingConfig.getCachePersistence();
        this.h3DistanceCache = distanceMatrixPersistence.importCache();

        // create the solver config and the solver manager
        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    /**
     * @param problemId The generated ID for the problem.
     * @param req       The dispatch request object.
     */
    @Override
    public void solveDispatchProblem(UUID problemId, DispatchRequest req) {
        long createdAt = Timestamp.valueOf(LocalDateTime.now()).getTime();
        String executionId = req.getExecutionId();
        logger.info("SolveDispatchProblem request :: problemId={} :: executionId={}", problemId, executionId);

        logger.debug("Pulling hubs information");
        List<PlanningHub> hubs = hubService.listHubs();

        logger.debug("Pulling vehicle capacity information");
        Map<String, MaxCapacity> maxCapacities = vehicleCapacityService.getMaxCapacities();

        // maintain lookup tables for all locations, also for pickups and drop-offs
        Map<String, Location> locationMap = new HashMap<>();
        Map<String, Location> pickupLocations = new HashMap<>();
        Map<String, Location> dropoffLocations = new HashMap<>();

        // hub locations
        for (PlanningHub hub : hubs) {
            HubLocation hubLoc = new HubLocation(hub.getId(), hub.getCoordinate());
            locationMap.put(hub.getId(), hubLoc);
        }

        // THIS IS A HACK - DO NOT USE IN PROD
        // -------------------------------------------------------------------------------------------------------------
        // Removes all the orders that have either a pickup or a dropoff location that is NOT inside the cached area,
        // which we determine if it has a distance cached already inside our coverage area.
        // For prod, either report these removed orders and feed it back to the queue or filter out on the backend so
        // dispatcher doesn't have to handle it.
        // -------------------------------------------------------------------------------------------------------------
        H3Core h3 = H3.h3();

        // this lat/long should be somewhere in the center of your coverage area
        long centerHexa = h3.geoToH3(14.617794, 121.001995, h3DistanceCache.getH3Resolution());

        // keep the orders that have only "valid" pickup/dropoff locations for our caching mechanism
        Map<String, Order> validOrdersMap = new HashMap<>();

        for (Order o : req.getOrders()) {
            // filter orders that have the same order ID --> @PlanningId MUST BE UNIQUE
            if (validOrdersMap.containsKey(o.getOrderId())) {
                logger.warn("Skipping order {}: DUPLICATE ORDER ID", o.getOrderId());
                continue;
            }

            // check if origin/destination coordinates are in the cache coverage area
            Coordinate origin = o.getOrigin();
            Coordinate dest = o.getDestination();

            TravelDistance origDist = h3DistanceCache.getDistance(
                    h3.geoToH3(origin.getLatitude(), origin.getLongitude(), h3DistanceCache.getH3Resolution()), centerHexa);
            TravelDistance destDist = h3DistanceCache.getDistance(
                    h3.geoToH3(dest.getLatitude(), dest.getLongitude(), h3DistanceCache.getH3Resolution()), centerHexa);

            if (origDist == null || destDist == null) {
                logger.warn("Skipping order {} because origin or destination location is outside or on the edge of covered geo polygon", o.getOrderId());
                continue;
            }

            // save valid order
            validOrdersMap.put(o.getOrderId(), o);
        }
        List<Order> validOrders = new ArrayList<>(validOrdersMap.values());
        logger.debug("Original orders: {}, valid orders: {}", req.getOrders().length, validOrders.size());
        // -------------------------------------------------------------------------------------------------------------
        // -------------------------------------------------------------------------------------------------------------

        // create pickup and dropoff locations
        // reuse objects if the location IDs are reused
        // Location IDs MUST BE UNIQUE -> @PlanningId
        for (Order o : validOrders) {
            if (!locationMap.containsKey(o.getOrigin().getId())) {
                PickupLocation pickup = new PickupLocation(o.getOrigin().getId(), (Coordinate) o.getOrigin());
                locationMap.put(o.getOrigin().getId(), pickup);
            }

            if (!locationMap.containsKey(o.getDestination().getId())) {
                DropoffLocation dropoff = new DropoffLocation(o.getDestination().getId(), (Coordinate) o.getDestination());
                locationMap.put(o.getDestination().getId(), dropoff);
            }

            pickupLocations.put(o.getOrderId(), locationMap.get(o.getOrigin().getId()));
            dropoffLocations.put(o.getOrderId(), locationMap.get(o.getDestination().getId()));
        }

        // break down the orders to visits (and rides)
        // NOTE: Visits' IDs MUST BE UNIQUE --> @PlanningId
        List<PlanningVisit> planningVisits = new ArrayList<>();
        List<DeliveryRide> rides = new ArrayList<>();
        long rideId = 0;
        for (Order o : validOrders) {
            String orderId = o.getOrderId();

            PlanningVisit pickupVisit = new PlanningVisit();
            pickupVisit.setId(orderId + "-" + pickupLocations.get(orderId).getId());
            pickupVisit.setOrderId(orderId);
            pickupVisit.setVisitType(PlanningVisit.VisitType.PICKUP);
            pickupVisit.setLocation(pickupLocations.get(orderId));

            PlanningVisit dropoffVisit = new PlanningVisit();
            dropoffVisit.setId(orderId + "-" + dropoffLocations.get(orderId).getId());
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

        // generate "virtual" vehicles from hubs information
        // in prod, this could be replaced with querying drivers from the DriverQueryAPI
        List<PlanningVehicle> vehicles = new ArrayList<>();

        // this time we pick the "smallest" motorbike as a max capacity definition
        // this can be obviously changed later
        MaxCapacity MOTORBIKE_MAXCAPACITY = maxCapacities.getOrDefault(VehicleType.MOTORCYCLE_150cc,
                MaxCapacity.builder().length(50).height(60).width(50).weight(10).build());

        logger.debug("Motorcycle Max capacity loaded: {}", MOTORBIKE_MAXCAPACITY);

        for (PlanningHub hub : hubs) {
            // hub location already added
            HubLocation vehicleLocation = (HubLocation) locationMap.get(hub.getId());
            logger.debug("Generating {} vehicles for {}", hub.getNumOfVehicles(), hub.getName());
            for (int i = 0; i < hub.getNumOfVehicles(); i++) {
                PlanningVehicle vehicle = new PlanningVehicle();
                vehicle.setMaxCapacity(MOTORBIKE_MAXCAPACITY);
                vehicle.setCurrentCapacity(CurrentCapacity.ZERO);
                vehicle.setLocation(vehicleLocation);
                vehicle.setId(UUID.randomUUID().toString());
                vehicles.add(vehicle);
            }
        }

        // generate the distance matrix that will be used to lookup distances between any location pairs
        logger.debug("Starting to generate a distance matrix with {} locations extracted from the request.", locationMap.size());
        List<Location> locationList = new ArrayList<>(locationMap.values());
        H3DistanceMatrix<Location> h3DistanceMatrix = H3DistanceMatrix.generate(this.h3DistanceCache, locationList);

        // save the reference to the distance matrix for each location for convenience
        for (Location loc : locationList) {
            loc.setDistanceMatrix(h3DistanceMatrix);
        }

        // create the problem instance
        DispatchSolution realProblem = DispatchSolution.builder()
                .id(problemId)
                .name("SameDayDirectPudoSolution")
                .createdAt(createdAt)
                .executionId(executionId)
                .score(HardMediumSoftLongScore.ZERO)
                .locations(locationList)
                .planningVisits(planningVisits)
                .planningVehicles(vehicles)
                .rides(rides)
                .hubs(hubs)
                .build();

        // optaplanner FTW
        org.optaplanner.core.api.solver.SolverJob<DispatchSolution, UUID> optaSolverJob = this.solverManager.solve(problemId, super::problemFinder, this::finalBestSolutionConsumer);
        // save the state
        this.solutionMap.put(problemId, new SolutionState<>(optaSolverJob, realProblem, System.currentTimeMillis()));
    }

    @Override
    protected void finalBestSolutionConsumerHook(DispatchSolution dispatchSolution, long solverDurationInMs) {
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
            logger.error("Saving solverJob failed: {}", e.getMessage());
            e.printStackTrace();
        }

        logger.debug(
                "[{}ms] :: finalBestSolutionConsumerHook :: planningVehicles = {} :: planningVisits = {} :: hubs = {} :: locations = {}",
                solverDurationInMs,
                dispatchSolution.getPlanningVehicles().size(),
                dispatchSolution.getPlanningVisits().size(),
                dispatchSolution.getHubs().size(),
                dispatchSolution.getLocations().size()
        );
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
