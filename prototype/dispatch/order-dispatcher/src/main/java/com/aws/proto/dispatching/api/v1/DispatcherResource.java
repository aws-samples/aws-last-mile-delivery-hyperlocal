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
package com.aws.proto.dispatching.api.v1;

import com.aws.proto.dispatching.api.request.AssignDriversRequest;
import com.aws.proto.dispatching.api.response.DispatcherRequestResult;
import com.aws.proto.dispatching.api.response.DispatcherResult;
import com.aws.proto.dispatching.config.RoutingConfig;
import com.aws.proto.dispatching.config.SolutionConfig;
import com.aws.proto.dispatching.data.DriverQueryManager;
import com.aws.proto.dispatching.data.ddb.DdbDemographicAreaSettingsService;
import com.aws.proto.dispatching.data.entity.DemographicAreaSetting;
import com.aws.proto.dispatching.data.entity.InputDriverData;
import com.aws.proto.dispatching.domain.planningentity.base.Order;
import com.aws.proto.dispatching.domain.location.CustomerLocation;
import com.aws.proto.dispatching.domain.location.LocationBase;
import com.aws.proto.dispatching.domain.location.RestaurantLocation;
import com.aws.proto.dispatching.domain.planningentity.base.PlanningDriverBase;
import com.aws.proto.dispatching.domain.planningentity.v1.CustomerVisit;
import com.aws.proto.dispatching.domain.planningentity.v1.PlanningDriver;
import com.aws.proto.dispatching.domain.planningentity.v1.PlanningVisit;
import com.aws.proto.dispatching.domain.planningentity.v1.RestaurantVisit;
import com.aws.proto.dispatching.planner.solution.v1.DispatchingSolution;
import com.aws.proto.dispatching.planner.solution.SolutionState;
import com.aws.proto.dispatching.routing.Coordinates;
import com.aws.proto.dispatching.routing.GraphhopperRouter;
import org.optaplanner.core.api.solver.SolverManager;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.SolverManagerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@ApplicationScoped
@Path("/v1/dispatch")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DispatcherResource {
    private static final Logger logger = LoggerFactory.getLogger(DispatcherResource.class);

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

    GraphhopperRouter graphhopperRouter;

    DispatcherResource(RoutingConfig routingConfig, SolutionConfig solutionConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());

        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
//        solverConfig.getScoreDirectorFactoryConfig().setConstraintProviderCustomProperties();
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    @POST
    @Path("assign-drivers")
    public DispatcherRequestResult assignDrivers(AssignDriversRequest req) {
        List<PlanningVisit> planningVisits = new ArrayList<>();
        List<PlanningDriverBase> drivers = driverQueryManager.retrieveDriversWithExtendingRadius(
          Coordinates.valueOf(req.centroid.lat, req.centroid.lon), req.orders.length);

        List<LocationBase> allLocations = new ArrayList<>();

        for (AssignDriversRequest.Order inputOrder : req.orders) {
            Order order = new Order(inputOrder.orderId, inputOrder.createdAt, inputOrder.state, inputOrder.restaurant.preparationTimeInMins);
            RestaurantLocation restaurantLocation = new RestaurantLocation(inputOrder.restaurant.id, Coordinates.valueOf(inputOrder.restaurant.lat, inputOrder.restaurant.lon));
            CustomerLocation customerLocation = new CustomerLocation(inputOrder.customer.id, Coordinates.valueOf(inputOrder.customer.lat, inputOrder.customer.lon));

            RestaurantVisit restaurantVisit = new RestaurantVisit(order, restaurantLocation);
            CustomerVisit customerVisit = new CustomerVisit(order, customerLocation);

            planningVisits.add(restaurantVisit);
            planningVisits.add(customerVisit);

            allLocations.add(restaurantLocation);
            allLocations.add(customerLocation);
        }

        // save locations to _all_ locations
        drivers.forEach(d -> allLocations.add(d.getLocation()));
        List<PlanningDriver> planningDrivers = drivers.stream().map(d -> new PlanningDriver(d)).collect(Collectors.toList());

//        DistanceMatrix distanceMatrix = DistanceMatrix.generate(allLocations, this.graphhopperRouter);
//        logger.info(distanceMatrix.toString());
//        for (LocationBase loc : allLocations) {
//            loc.setDistanceMatrix(distanceMatrix);
//        }

        UUID manualAssignmentId = this.manualAssignment(planningVisits, planningDrivers);
        return new DispatcherRequestResult(manualAssignmentId.toString());

//        DispatchingSolution problem = new DispatchingSolution(solutionId, "DispatchingSolution", planningDrivers, planningVisits);
//        this.solutionMap.put(solutionId, new SolutionState<>(problem, System.currentTimeMillis()));
//        this.solverManager.solveAndListen(solutionId, this::problemFinder, SolutionConsumer::consumeSolution);
    }

    Map<UUID, DispatcherResult> TMP_RESULTS = new HashMap<>();
    private UUID manualAssignment(List<PlanningVisit> planningVisits, List<PlanningDriver> drivers) {
        int orderNum = planningVisits.size() / 2;
        int driverNum = drivers.size();

        int len = Math.min(orderNum, driverNum);

        List<DispatcherResult.AssignedOrders> assignedOrders = new ArrayList<>();
        List<String> unassignedOrders = new ArrayList<>();


        for (int i = 0; i < len; i++) {
            PlanningVisit pickup = planningVisits.get(2*i);
            PlanningVisit dropoff = planningVisits.get(2*i+1);
            PlanningDriver driver = drivers.get(i);

            assignedOrders.add(new DispatcherResult.AssignedOrders(
              driver.getId(),
              driver.getDriverIdentity(),
              driver.getLocation(),
              new ArrayList<>(Arrays.asList(pickup.getOrder().getOrderId())),
              new ArrayList<>(Arrays.asList(
                new DispatcherResult.Visit(pickup.getLocation()),
                new DispatcherResult.Visit(dropoff.getLocation())
              ))
            ));
        }

        if(orderNum > driverNum) {
            for (int i = driverNum; i < orderNum; i++) {
                unassignedOrders.add(planningVisits.get(2*i).getOrder().getOrderId());
            }
        }

        UUID id = UUID.randomUUID();
        DispatcherResult result = new DispatcherResult(UUID.randomUUID(), "execId-1234", Timestamp.valueOf(LocalDateTime.now()).getTime(), assignedOrders, unassignedOrders, "SOLVED", "0hard/0medium/0soft");
        TMP_RESULTS.put(id, result);

        logger.debug("Manually assigned drivers and orders: {}", result);
        return id;
    }

    DispatchingSolution problemFinder(Long problemId) {
        return this.solutionMap.get(problemId).problem;
    }

    @GET
    @Path("test-drivers")
    public List<InputDriverData> testDriverClient() {
        List<InputDriverData> result = driverQueryManager.getDrivers("m", "IDLE", -6.185903, 106.841798, 100, 200000);
        return result;
    }

    @GET
    @Path("test-demarea-settings")
    public List<DemographicAreaSetting> testDemographicAreaSettingsClient() {
        Map<String, DemographicAreaSetting> dict = demAreaService.findAll();
        return new ArrayList<>(dict.values());
    }

    @GET
    @Path("status/{problemId}")
    public DispatcherResult getSolutionStatus(@PathParam("problemId") String id) {
        logger.debug(":: GetSolutionStatus :: problemId = {}", id);
        UUID problemId = UUID.fromString(id);

        DispatcherResult res = TMP_RESULTS.get(problemId);

        if(res == null) {
            return new DispatcherResult(problemId, "", Timestamp.valueOf(LocalDateTime.now()).getTime(), null, null, "NOT_EXISTS", null);
        }

        return res;

//        // get from in-mem map
//        SolutionState<DispatchingSolution, UUID> state = this.solutionMap.get(problemId);
//
//        // doesn't exist
//        if (state == null) {
//            logger.warn(":: GetSolutionStatus :: problem not found ({})", problemId);
//            return new DispatcherResult(problemId, null, null, "NOT_SOLVING", null);
//        }
//
//        SolverStatus solverStatus = state.solverJob.getSolverStatus();
//        if(solverStatus == SolverStatus.NOT_SOLVING) {
//            logger.debug(":: Solution found :: problemId = {}", problemId);
//            try {
//                DispatchingSolution solution = state.solverJob.getFinalBestSolution();
//                DispatcherResult result = SolutionConsumer.buildResult(solution, solverStatus);
//                logger.trace("Removing problemId {} from solutionMap", problemId);
//
//                this.solutionMap.remove(problemId);
//                return result;
//            } catch (ExecutionException | InterruptedException e) {
//                logger.error("Error while retrieving solution", e);
//                return new DispatcherResult(problemId, solverStatus);
//            }
//        } else {
//            logger.debug(":: Problem still not solved :: problemId = {}", problemId);
//            return new DispatcherResult(problemId, solverStatus);
//        }
    }

    /**
     * Endpoint to trigger stopping solver
     */
    @POST
    @Path("terminate/{problemId}")
    public DispatcherResult stopSolving(@PathParam("problemId") String id) {
        UUID problemId = UUID.fromString(id);
        // get from in-mem map
        SolutionState<DispatchingSolution, UUID> state = this.solutionMap.get(problemId);

        // doesn't exist
        if (state == null) {
            return new DispatcherResult(problemId, "", Timestamp.valueOf(LocalDateTime.now()).getTime(), null, null, "NOT_SOLVING", null);
        }

        // terminate solution
        this.solverManager.terminateEarly(problemId);

//        this.solutionRepository.updateStatus(problemId, SolutionStatus.TERMINATED);

        logger.info("Dispatch solver terminated after {}", state.solverJob.getSolvingDuration());

        List<DispatcherResult.AssignedOrders> assignedOrders = new ArrayList<>();
        for(PlanningDriver driver : state.problem.getPlanningDrivers()) {
            Set<String> orderIds = new HashSet<>();
            List<DispatcherResult.Visit> route = new ArrayList<>();

            PlanningVisit visit = driver.getNextPlanningVisit();
            if(visit == null) {
                continue;
            }

            while(visit != null) {
                orderIds.add(visit.getOrder().getOrderId());

                route.add(new DispatcherResult.Visit(
                  visit.getLocationType(), visit.getLocation().getId(),
                  visit.getLocation().getCoordinates().latitude().doubleValue(),
                  visit.getLocation().getCoordinates().longitude().doubleValue()));

                visit = visit.getNextPlanningVisit();
            }

            assignedOrders.add(
              new DispatcherResult.AssignedOrders(
                driver.getId(), driver.getDriverIdentity(), driver.getLocation(), new ArrayList<>(orderIds), route));
        }

        DispatcherResult result = new DispatcherResult(problemId, "execId-1234", Timestamp.valueOf(LocalDateTime.now()).getTime(), assignedOrders, new ArrayList<>(), "TERMINATED", state.problem.getScore().toString());
        this.solutionMap.remove(problemId);

        return result;
    }


}
