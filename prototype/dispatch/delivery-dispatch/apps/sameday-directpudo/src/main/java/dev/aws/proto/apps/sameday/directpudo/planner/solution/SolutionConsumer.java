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

package dev.aws.proto.apps.sameday.directpudo.planner.solution;

import dev.aws.proto.apps.appcore.api.response.DeliverySegment;
import dev.aws.proto.apps.appcore.api.response.Segment;
import dev.aws.proto.apps.sameday.directpudo.Order;
import dev.aws.proto.apps.sameday.directpudo.api.response.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJob;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import dev.aws.proto.core.routing.distance.TravelDistance;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import dev.aws.proto.core.routing.route.PolylineHelper;
import org.optaplanner.core.api.solver.SolverStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

public class SolutionConsumer {
    private static final Logger logger = LoggerFactory.getLogger(SolutionConsumer.class);

    public static SolverJob extractSolverJob(DispatchSolution solution, SolverStatus solverStatus, long solverDurationInMs) {
        SolverJob result = SolverJob.builder()
                .problemId(solution.getId())
                .createdAt(solution.getCreatedAt())
                .score(solution.getScore().toString())
                .solverDurationInMs(solverDurationInMs)
                .state(solverStatus.name())
                .executionId(solution.getExecutionId())
                .build();

        // TODO: add distanceMatrixMetrics later

        return result;
    }

    /**
     * Builds the list of delivery jobs from the solution.
     *
     * @param solution The dispatch solution.
     * @param orders   TEMPORARY PARAMETER UNTIL THE REAL MODELING WILL BE IMPLEMENTED THIS IS FOR MOCKING NOW
     * @return The list of delivery jobs.
     */
    public static List<DeliveryJob> MOCK_extractDeliveryJobs(DispatchSolution solution, List<Order> orders) {
        UUID solverJobId = solution.getId();

        List<DeliveryJob> deliveryJobs = new ArrayList<>();

        int ORDERS_PER_JOB = 10;
        int numOfJobs = orders.size() / ORDERS_PER_JOB;

        Random rand = new Random();

        for (int i = 0; i <= numOfJobs; i++) {
            int fromIdx = i * ORDERS_PER_JOB;
            int toIdx = (i + 1) * ORDERS_PER_JOB;
            if (toIdx > orders.size()) {
                toIdx = orders.size();
            }

            // if ORDERS_PER_JOB is a divisor of orders.size(), skip
            if (fromIdx == toIdx) {
                continue;
            }

            List<Order> chunk = orders.subList(fromIdx, toIdx);

            int segmentCtr = 0;
            Coordinate prevLoc = chunk.get(0).getOrigin();
            List<DeliverySegment> jobSegments = new ArrayList<>();
            for (Order o : chunk) {

                DeliverySegment segmentOrigin = DeliverySegment.builder()
                        .orderId(o.getOrderId())
                        .index(segmentCtr++)
                        .from((Coordinate) prevLoc)
                        .to((Coordinate) o.getOrigin())
                        .segmentType(DeliverySegment.SegmentType.TO_ORIGIN)
                        .route(new Segment(Math.abs(rand.nextLong()) % 2000, Math.abs(rand.nextLong()) % 1000, PolylineHelper.encodePointsToPolyline(List.of((Coordinate) prevLoc, (Coordinate) o.getOrigin()))))
                        .build();

                DeliverySegment segmentDestination = DeliverySegment.builder()
                        .orderId(o.getOrderId())
                        .index(segmentCtr++)
                        .from((Coordinate) o.getOrigin())
                        .to((Coordinate) o.getDestination())
                        .segmentType(DeliverySegment.SegmentType.TO_DESTINATION)
                        .route(new Segment(Math.abs(rand.nextLong()) % 2000, Math.abs(rand.nextLong()) % 1000, PolylineHelper.encodePointsToPolyline(List.of((Coordinate) o.getOrigin(), (Coordinate) o.getDestination()))))
                        .build();

                prevLoc = o.getDestination();

                jobSegments.add(segmentOrigin);
                jobSegments.add(segmentDestination);
            }

            DeliveryJob deliveryJob = DeliveryJob.builder()
                    .id(UUID.randomUUID())
                    .createdAt(Timestamp.valueOf(LocalDateTime.now()).getTime())
                    .solverJobId(solverJobId)
                    .segments(jobSegments)
                    .route(Segment.fromSegments(jobSegments))
                    .build();

            deliveryJobs.add(deliveryJob);
        }

        return deliveryJobs;
    }

    public static List<DeliveryJob> extractDeliveryJobs(DispatchSolution solution, GraphhopperRouter router) {
        UUID solverJobId = solution.getId();
        List<DeliveryJob> deliveryJobs = new ArrayList<>();

        solution.getPlanningVehicles().forEach(planningVehicle -> {
            List<DeliverySegment> jobSegments = new ArrayList<>();

            PlanningVisit visit = planningVehicle.getNextPlanningVisit();
            if (visit == null) {
                // no visits assigned --> no deliveryJob created
                return;
            }

            Location prevLoc = planningVehicle.getLocation();

            while (visit != null) {
                PlanningVisit.VisitType visitType = visit.getVisitType();
                DeliverySegment.SegmentType segmentType;
                switch (visitType) {
                    case PICKUP:
                        segmentType = DeliverySegment.SegmentType.TO_ORIGIN;
                        break;
                    case DROPOFF:
                        segmentType = DeliverySegment.SegmentType.TO_DESTINATION;
                        break;
                    default:
                        segmentType = DeliverySegment.SegmentType.TO_HUB;
                        break;
                }

                TravelDistance segmentDist = prevLoc.distanceTo(visit.getLocation());
                List<Coordinate> segmentPath = router.getPath(prevLoc.getCoordinate(), visit.getLocation().coordinate());
                String segmentPointsEnc = PolylineHelper.encodePointsToPolyline(segmentPath);

                DeliverySegment segment = DeliverySegment.builder()
                        .orderId(visit.getOrderId())
                        .index(visit.getVisitIndex())
                        .from(prevLoc.getCoordinate())
                        .to(visit.getLocation().getCoordinate())
                        .segmentType(segmentType)
                        .route(new Segment(segmentDist.getDistanceInMeters(), segmentDist.getDistanceInSeconds(), segmentPointsEnc))
                        .build();

                prevLoc = visit.getLocation();
                jobSegments.add(segment);
                visit = visit.getNextPlanningVisit();
            }

            DeliveryJob deliveryJob = DeliveryJob.builder()
                    .id(UUID.randomUUID())
                    .createdAt(Timestamp.valueOf(LocalDateTime.now()).getTime())
                    .solverJobId(solverJobId)
                    .segments(jobSegments)
                    .route(Segment.fromSegments(jobSegments))
                    .build();
            deliveryJobs.add(deliveryJob);
        });

        return deliveryJobs;
    }

    public static void logSolution(DispatchSolution solution) {
        logger.debug("[{}] solution score: {}", solution.getId(), solution.getScore());

        AtomicInteger notAssignedVehicleCnt = new AtomicInteger(0);

        solution.getPlanningVehicles().forEach(vehicle -> {
            if (vehicle.getNextPlanningVisit() == null) {
                notAssignedVehicleCnt.incrementAndGet();
                return;
            }

            logger.debug("vehicle[{}] :: [visits = {}] :: location {}", vehicle.getId(), vehicle.chainLength(), vehicle.getLocation().getCoordinate());

            List<Coordinate> points = new ArrayList<>();
            points.add(vehicle.getLocation().getCoordinate());

            PlanningVisit visit = vehicle.getNextPlanningVisit();
            while (visit != null) {
                logger.debug("\t{}", visit);
                points.add(visit.getLocation().getCoordinate());
                visit = visit.getNextPlanningVisit();
            }

            String pointsEncoded = PolylineHelper.encodePointsToPolyline(points);
            String coordsStr = String.join(",", points.stream().map(c -> {
                return String.format("[%f, %f]", c.getLongitude(), c.getLatitude());
            }).collect(Collectors.toList()));


            StringBuilder sb = new StringBuilder();
            logger.debug("");
            logger.debug("\tPoints encoded: {}", pointsEncoded);
//            logger.debug("\tPoints: {}", coordsStr);
        });

        logger.debug("Number of vehicles not assigned: {}", notAssignedVehicleCnt.get());
    }
}
