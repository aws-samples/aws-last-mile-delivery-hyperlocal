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

import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.sameday.directpudo.Order;
import dev.aws.proto.apps.sameday.directpudo.api.request.DispatchRequest;
import dev.aws.proto.apps.sameday.directpudo.api.response.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJobWithDeliveryJobs;
import dev.aws.proto.apps.sameday.directpudo.data.DdbDeliveryJobService;
import dev.aws.proto.apps.sameday.directpudo.data.DdbSolverJobService;
import dev.aws.proto.apps.sameday.directpudo.data.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.SolutionConsumer;
import dev.aws.proto.core.routing.config.RoutingConfig;
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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
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

    DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;

        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper(), routingConfig.routingProfile());

//        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
//        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
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

        DispatchSolution problem = new DispatchSolution();
        problem.setId(problemId);
        problem.setName("SameDayDirectPudoSolution");
        problem.setName("MOCK_SameDayDirectPudoSolution");
        problem.setCreatedAt(createdAt);
        problem.setExecutionId(executionId);
        problem.setScore(HardMediumSoftLongScore.ZERO);

        try {
            SolverJob solverJob = SolutionConsumer.extractSolverJob(problem, SolverStatus.NOT_SOLVING, 1000);
            solverJobService.save(solverJob);
        } catch (Exception e) {
            logger.error("Saving solverjob failed: {}", e.getMessage());
            e.printStackTrace();
        }

        try {
            List<DeliveryJob> deliveryJobs = SolutionConsumer.extractDeliveryJobs(problem, Arrays.asList(req.getOrders()));
            deliveryJobService.saveJobsForSolverJobId(problemId, deliveryJobs);
        } catch (Exception e) {
            logger.error("Saving deliveryJobs for solverJobId {} failed: {}", problemId, e.getMessage());
            e.printStackTrace();
        }

        /// ---- END OF MOCK

        logger.debug("End of mock");

//        return;
//        logger.trace("Extracting locations from request orders");
//        List<LocationBase> allLocations = new ArrayList<>();
//        for (Order o : req.getOrders()) {
//            PickupLocation pickup = new PickupLocation(o.getOrigin().getId(), (Coordinate) o.getOrigin());
//            DropoffLocation dropoff = new DropoffLocation(o.getDestination().getId(), (Coordinate) o.getDestination());
//
//            allLocations.add(pickup);
//            allLocations.add(dropoff);
//        }
//        logger.debug("Starting to generate a distance matrix with {} locations extracted from the request.", allLocations.size());
//        DistanceMatrix distanceMatrix = DistanceMatrix.generate(allLocations, this.graphhopperRouter);
//        logger.debug("DistanceMatrix generated for {} locations in {}ms", allLocations.size(), distanceMatrix.getGeneratedTime());
//
//        for (LocationBase loc : allLocations) {
//            loc.setDistanceMatrix(distanceMatrix);
//        }


    }

    @Override
    protected void finalBestSolutionConsumerHook(DispatchSolution dispatchSolution, long solverDurationInMs) {
//        deliveryJobService.saveJobsForSolverJobId(dispatchSolution.getId());
        // TODO: log solution
    }

    public SolverJobWithDeliveryJobs getSolutionStatus(UUID problemId) {
        logger.debug("Getting solution status for id {}", problemId);

        SolverJob solverJob = solverJobService.getItem(problemId);
        if (solverJob == null) {
            logger.debug("No solverJob found with ID {}", problemId);
            return null;
        }

        List<DeliveryJob> deliveryJobs = deliveryJobService.retreiveDeliveryJobsForSolverJobId(problemId);
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
