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

package dev.aws.proto.apps.appcore.api;

import dev.aws.proto.apps.appcore.api.request.DispatchRequest;
import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.planner.solution.DispatchSolutionBase;
import dev.aws.proto.apps.appcore.planner.solution.SolutionState;
import dev.aws.proto.core.Order;
import dev.aws.proto.core.routing.config.RoutingConfig;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import org.optaplanner.core.api.solver.SolverJob;
import org.optaplanner.core.api.solver.SolverManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import java.util.Map;
import java.util.UUID;

/**
 * Base class for DispatchService implementations.
 * Extend this class when you're implementing your own domain.
 *
 * @param <TOrder>            The type of the Order
 * @param <TDispatchRequest>  The type of the DispatchRequest
 * @param <TDispatchSolution> The type of the DispatchSolution
 */
public abstract class DispatchService<
        TOrder extends Order,
        TDispatchRequest extends DispatchRequest<TOrder>,
        TDispatchSolution extends DispatchSolutionBase
        > {

    private static final Logger logger = LoggerFactory.getLogger(DispatchService.class);

    /**
     * Configuration for routing (OSM file locations, graphhopper, etc).
     */
    @Inject
    protected RoutingConfig routingConfig;

    /**
     * Configuration for Optaplanner (solver.xml).
     */
    @Inject
    protected SolutionConfig solutionConfig;

    /**
     * Routing tasks with Graphhopper SDK.
     */
    protected GraphhopperRouter graphhopperRouter;

    /**
     * Optaplanner Solver manager.
     */
    protected SolverManager<TDispatchSolution, UUID> solverManager;

    /**
     * Lookup table for solutions based on their ID.
     */
    protected Map<UUID, SolutionState<TDispatchSolution, UUID>> solutionMap;

    /**
     * Triggers the solver to solver a dispatching problem.
     *
     * @param problemId The generated ID for the problem.
     * @param request   The request object that holds all the necessary information to build the planning variables/entities.
     */
    protected abstract void solveDispatchProblem(UUID problemId, TDispatchRequest request);

    /**
     * Placeholder to create custom implementations for storing solution data, cleaning up, etc.
     *
     * @param solution           The dispatching solution instance.
     * @param solverDurationInMs The duration took to solve the problem, in milliseconds.
     */
    protected abstract void finalBestSolutionConsumerHook(TDispatchSolution solution, long solverDurationInMs);

    /**
     * Final best solution consumer callback.
     *
     * @param solution The dispatching solution instance.
     */
    protected void finalBestSolutionConsumer(TDispatchSolution solution) {
        UUID problemId = solution.getId();

        SolverJob<TDispatchSolution, UUID> solverJob = this.solutionMap.get(problemId).solverJob;
        long solverDurationInMs = solverJob.getSolvingDuration().getSeconds() * 1000 + (solverJob.getSolvingDuration().getNano() / 1_000_000);

        // custom implementations for storing data, cleaning up, etc
        this.finalBestSolutionConsumerHook(solution, solverDurationInMs);

        logger.debug("Removing problemId {} from solutionMap at finalBestSolutionConsumer", problemId);
        this.solutionMap.remove(problemId);
    }

    /**
     * Problem finder callback for the solver.
     *
     * @param problemId The solving job's id
     * @return The solution instance.
     */
    protected TDispatchSolution problemFinder(UUID problemId) {
        return this.solutionMap.get(problemId).problem;
    }


}
