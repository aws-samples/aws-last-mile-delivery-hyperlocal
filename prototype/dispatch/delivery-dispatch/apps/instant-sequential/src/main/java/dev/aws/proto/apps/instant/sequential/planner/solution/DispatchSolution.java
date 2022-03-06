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

package dev.aws.proto.apps.instant.sequential.planner.solution;

import dev.aws.proto.apps.appcore.planner.solution.DispatchSolutionBase;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDelivery;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.util.Constants;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
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
@NoArgsConstructor
public class DispatchSolution extends DispatchSolutionBase<HardMediumSoftLongScore> {
    private List<PlanningDriver> planningDrivers;
    private List<PlanningDelivery> planningDeliveries;

    @PlanningScore
    @Getter
    @Setter
    private HardMediumSoftLongScore score;

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
}
