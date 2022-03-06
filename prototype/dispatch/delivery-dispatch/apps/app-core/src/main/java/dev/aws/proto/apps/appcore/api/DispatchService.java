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
import org.optaplanner.core.api.solver.SolverManager;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.SolverManagerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public abstract class DispatchService<
        TOrder extends Order,
        TDispatchRequest extends DispatchRequest<TOrder>,
        TDispatchSolution extends DispatchSolutionBase
        > {

    private static final Logger logger = LoggerFactory.getLogger(DispatchService.class);

    protected RoutingConfig routingConfig;
    protected SolutionConfig solutionConfig;
    protected GraphhopperRouter graphhopperRouter;
    protected final SolverManager<TDispatchSolution, UUID> solverManager;
    protected final Map<UUID, SolutionState<TDispatchSolution, UUID>> solutionMap;

    protected DispatchService() {
        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    protected DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig) {
        this.routingConfig = routingConfig;
        this.solutionConfig = solutionConfig;
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());

        SolverConfig solverConfig = SolverConfig.createFromXmlFile(java.nio.file.Path.of(this.solutionConfig.getSolverConfigXmlPath()).toFile());
        this.solverManager = SolverManager.create(solverConfig, new SolverManagerConfig());
//        SolverFactory<DispatchingSolution> solverFactory = SolverFactory.create(solverConfig);
//        this.solverManager = new DefaultSolverManager<>(solverFactory, new SolverManagerConfig());
        this.solutionMap = new ConcurrentHashMap<>();
    }

    protected abstract void solveDispatchProblem(UUID problemId, TDispatchRequest request);

    protected abstract void finalBestSolutionConsumer(TDispatchSolution solution);

    protected TDispatchSolution problemFinder(UUID problemId) {
        return this.solutionMap.get(problemId).problem;
    }


}
