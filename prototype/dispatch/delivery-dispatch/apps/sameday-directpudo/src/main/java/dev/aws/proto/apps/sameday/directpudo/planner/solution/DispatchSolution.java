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

import dev.aws.proto.apps.appcore.planner.solution.DispatchSolutionBase;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.DeliveryRide;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningHub;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVehicle;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import dev.aws.proto.apps.sameday.directpudo.util.Constants;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.optaplanner.core.api.domain.solution.PlanningEntityCollectionProperty;
import org.optaplanner.core.api.domain.solution.PlanningScore;
import org.optaplanner.core.api.domain.solution.PlanningSolution;
import org.optaplanner.core.api.domain.solution.ProblemFactCollectionProperty;
import org.optaplanner.core.api.domain.valuerange.ValueRangeProvider;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;

import java.util.List;

@PlanningSolution
@Data
@NoArgsConstructor
@SuperBuilder
public class DispatchSolution extends DispatchSolutionBase<HardMediumSoftLongScore> {

    private List<PlanningVehicle> planningVehicles;
    private List<PlanningVisit> planningVisits;
    private List<DeliveryRide> rides;
    private List<Location> locations;
    private List<PlanningHub> hubs;

    @PlanningScore
    @Getter
    @Setter
    public HardMediumSoftLongScore score;

    @ProblemFactCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningVehicleRange)
    public List<PlanningVehicle> getPlanningVehicles() {
        return this.planningVehicles;
    }

    @PlanningEntityCollectionProperty
    @ValueRangeProvider(id = Constants.PlanningVisitRange)
    public List<PlanningVisit> getPlanningVisits() {
        return this.planningVisits;
    }

    @ProblemFactCollectionProperty
    public List<DeliveryRide> getRides() {
        return this.rides;
    }

    @ProblemFactCollectionProperty
    public List<Location> getLocations() {
        return this.locations;
    }

    @ProblemFactCollectionProperty
    public List<PlanningHub> getHubs() {
        return this.hubs;
    }

}
