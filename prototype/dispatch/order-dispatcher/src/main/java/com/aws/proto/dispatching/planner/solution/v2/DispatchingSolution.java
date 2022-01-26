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
package com.aws.proto.dispatching.planner.solution.v2;

import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDriver;
import com.aws.proto.dispatching.domain.planningentity.v2.PlanningDelivery;
import com.aws.proto.dispatching.util.Constants;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.optaplanner.core.api.domain.solution.PlanningEntityCollectionProperty;
import org.optaplanner.core.api.domain.solution.PlanningScore;
import org.optaplanner.core.api.domain.solution.PlanningSolution;
import org.optaplanner.core.api.domain.solution.ProblemFactCollectionProperty;
import org.optaplanner.core.api.domain.valuerange.ValueRangeProvider;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@PlanningSolution
public class DispatchingSolution {

    @JsonProperty("dispatchingSolutionId")
    private UUID id;

    private String name;

    private Long createdAt;
    private String executionId;

    private List<PlanningDriver> planningDrivers;
    private List<PlanningDelivery> planningDeliveries;

    private HardMediumSoftLongScore score;

    public DispatchingSolution() {}

    public DispatchingSolution(UUID id, String name, long createdAt, String executionId, List<PlanningDriver> planningDrivers, List<PlanningDelivery> planningDeliveries) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.executionId = executionId;
        this.planningDrivers = planningDrivers;
        this.planningDeliveries = planningDeliveries;
    }

//    @PlanningEntityCollectionProperty
//    protected List<DeliveryPlan> deliveryPlans;
//    @ProblemFactCollectionProperty
//    protected List<MultiPDDelivery> multiPDDeliveries;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getCreatedAt() {
        return createdAt;
    }

    public String getExecutionId() { return executionId; }

    @ProblemFactCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningDriverRange)
    public List<PlanningDriver> getPlanningDrivers() {
        return planningDrivers;
    }

    public void setPlanningDrivers(List<PlanningDriver> planningDrivers) {
        this.planningDrivers = planningDrivers;
    }

    @PlanningEntityCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningDeliveryRange)
    public List<PlanningDelivery> getPlanningDeliveries() {
        return planningDeliveries;
    }

    public void setPlanningDeliveries(List<PlanningDelivery> planningDeliveries) {
        this.planningDeliveries = planningDeliveries;
    }

    @PlanningScore
    public HardMediumSoftLongScore getScore() {
        return score;
    }

    public void setScore(HardMediumSoftLongScore score) {
        this.score = score;
    }
}
