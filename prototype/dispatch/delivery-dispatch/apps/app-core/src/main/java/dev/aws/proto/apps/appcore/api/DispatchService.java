package dev.aws.proto.apps.appcore.api;

import dev.aws.proto.apps.appcore.api.request.DispatchRequest;
import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.planner.solution.DispatchSolutionBase;
import dev.aws.proto.apps.appcore.planner.solution.SolutionState;
import dev.aws.proto.core.Order;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import dev.aws.proto.core.routing.config.RoutingConfig;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
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
    protected SolverManager<TDispatchSolution, UUID> solverManager;
    protected final Map<UUID, SolutionState<TDispatchSolution, UUID>> solutionMap;

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
