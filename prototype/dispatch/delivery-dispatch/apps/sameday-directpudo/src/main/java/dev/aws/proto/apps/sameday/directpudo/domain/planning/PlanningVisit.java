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

package dev.aws.proto.apps.sameday.directpudo.domain.planning;

import dev.aws.proto.apps.sameday.directpudo.domain.planning.solver.VisitIndexUpdatingVariableListener;
import dev.aws.proto.apps.sameday.directpudo.util.Constants;
import dev.aws.proto.core.routing.location.LocationBase;
import lombok.Getter;
import lombok.Setter;
import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.variable.*;

// TODO: add difficultyWeightFactoryClass (and change solver-config's constructionHeuristicType
@PlanningEntity
@Getter
@Setter
public class PlanningVisit implements VisitOrDriver {

    public static enum VisitType {
        PICKUP,
        DROPOFF
    }

    private VisitType visitType;
    private LocationBase location;
    private DeliveryRide ride;

    // planning variables: changes during planning
    private VisitOrDriver previousVisitOrDriver;

    // shadow variables
    private PlanningVisit nextVisit;
    private PlanningDriver planningDriver;
    private Integer visitIndex;

    // getters/setters overrides

    @Override
    public LocationBase getLocation() {
        return this.location;
    }

    // TODO: maybe add getParcelSize

    @PlanningVariable(
            valueRangeProviderRefs = {Constants.PlanningDriverRange, Constants.PlanningVisitRange},
            graphType = PlanningVariableGraphType.CHAINED
    )
    public VisitOrDriver getPreviousVisitOrDriver() {
        return this.previousVisitOrDriver;
    }

    @Override
    public PlanningVisit getNextPlanningVisit() {
        return this.nextVisit;
    }

    @Override
    public void setNextPlanningVisit(PlanningVisit nextVisit) {
        this.nextVisit = nextVisit;
    }

    @Override
    @AnchorShadowVariable(sourceVariableName = Constants.PreviousVisitOrDriver)
    public PlanningDriver getPlanningDriver() {
        return this.planningDriver;
    }

    @CustomShadowVariable(
            variableListenerClass = VisitIndexUpdatingVariableListener.class,
            sources = {@PlanningVariableReference(variableName = Constants.PreviousVisitOrDriver)}
    )
    public Integer getVisitIndex() {
        return this.visitIndex;
    }

    // todo: add distanceTo() method
}
