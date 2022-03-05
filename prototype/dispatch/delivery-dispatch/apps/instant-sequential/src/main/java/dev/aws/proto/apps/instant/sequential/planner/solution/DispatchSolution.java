package dev.aws.proto.apps.instant.sequential.planner.solution;

import com.fasterxml.jackson.annotation.JsonProperty;
import dev.aws.proto.apps.appcore.planner.solution.DispatchSolutionBase;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDelivery;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.util.Constants;
import lombok.Data;
import org.optaplanner.core.api.domain.solution.PlanningEntityCollectionProperty;
import org.optaplanner.core.api.domain.solution.PlanningScore;
import org.optaplanner.core.api.domain.solution.PlanningSolution;
import org.optaplanner.core.api.domain.solution.ProblemFactCollectionProperty;
import org.optaplanner.core.api.domain.valuerange.ValueRangeProvider;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;

import java.util.List;
import java.util.UUID;

@PlanningSolution
@Data
public class DispatchSolution extends DispatchSolutionBase<HardMediumSoftLongScore> {
    private List<PlanningDriver> planningDrivers;
    private List<PlanningDelivery> planningDeliveries;

    public DispatchSolution(UUID id, String name, long createdAt, String executionId, List<PlanningDriver> planningDrivers, List<PlanningDelivery> planningDeliveries) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.executionId = executionId;
        this.planningDrivers = planningDrivers;
        this.planningDeliveries = planningDeliveries;
    }

    @ProblemFactCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningDriverRange)
    public List<PlanningDriver> getPlanningDrivers() {
        return planningDrivers;
    }

    @PlanningEntityCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningDeliveryRange)
    public List<PlanningDelivery> getPlanningDeliveries() {
        return planningDeliveries;
    }

    @PlanningScore
    @Override
    public HardMediumSoftLongScore getScore() {
        return score;
    }
}
