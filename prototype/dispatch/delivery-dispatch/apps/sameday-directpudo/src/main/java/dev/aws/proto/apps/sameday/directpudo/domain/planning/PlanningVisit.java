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
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import dev.aws.proto.apps.sameday.directpudo.util.Constants;
import dev.aws.proto.core.routing.distance.TravelDistance;
import lombok.Getter;
import lombok.Setter;
import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.solution.cloner.DeepPlanningClone;
import org.optaplanner.core.api.domain.variable.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// TODO: add difficultyWeightFactoryClass (and change solver-config's constructionHeuristicType
@PlanningEntity
@Getter
@Setter
public class PlanningVisit extends PlanningBase<String> implements VisitOrDriver {
public class PlanningVisit extends PlanningBase<String> implements VisitOrVehicle {
    private static final Logger logger = LoggerFactory.getLogger(PlanningVisit.class);

    public static enum VisitType {
        PICKUP,
        DROPOFF
    }

    private VisitType visitType;
    private Location location;
    private DeliveryRide ride;
    private String orderId;

    // planning variables: changes during planning
    private VisitOrDriver previousVisitOrDriver;
    private VisitOrVehicle previousVisitOrVehicle;

    // shadow variables
    private PlanningVisit nextVisit;
    private PlanningDriver planningDriver;
    private PlanningVisit nextPlanningVisit;
    private PlanningVehicle planningVehicle;
    private Integer visitIndex;

    // getters/setters overrides

    @Override
    public Location getLocation() {
        return this.location;
    }

    // TODO: maybe add getParcelSize

    @DeepPlanningClone
    @PlanningVariable(
            valueRangeProviderRefs = {Constants.PlanningDriverRange, Constants.PlanningVisitRange},
            valueRangeProviderRefs = {Constants.PlanningVehicleRange, Constants.PlanningVisitRange},
            graphType = PlanningVariableGraphType.CHAINED
    )
    public VisitOrDriver getPreviousVisitOrDriver() {
        return this.previousVisitOrDriver;
    public VisitOrVehicle getPreviousVisitOrVehicle() {
        return this.previousVisitOrVehicle;
    }

    @Override
    public PlanningVisit getNextPlanningVisit() {
        return this.nextVisit;
        return this.nextPlanningVisit;
    }

    @Override
    public void setNextPlanningVisit(PlanningVisit nextVisit) {
        this.nextVisit = nextVisit;
    }

    @Override
    @AnchorShadowVariable(sourceVariableName = Constants.PreviousVisitOrDriver)
    public PlanningDriver getPlanningDriver() {
        return this.planningDriver;
    @AnchorShadowVariable(sourceVariableName = Constants.PreviousVisitOrVehicle)
    public PlanningVehicle getPlanningVehicle() {
        return this.planningVehicle;
    }

    @CustomShadowVariable(
            variableListenerClass = VisitIndexUpdatingVariableListener.class,
            sources = {@PlanningVariableReference(variableName = Constants.PreviousVisitOrDriver)}
            sources = {@PlanningVariableReference(variableName = Constants.PreviousVisitOrVehicle)}
    )
    public Integer getVisitIndex() {
        return this.visitIndex;
    }

    // todo: add distanceTo() method

    public String getPlanningDriverId() {
        return planningDriver == null ?
                "null" : planningDriver.getId();
    @Override
    public int hashCode() {
        return super.id.hashCode();
    }

    @Override
    public String toString() {
        String prev = previousVisitOrDriver == null ? "null" :
                previousVisitOrDriver instanceof PlanningDriver ? ((PlanningDriver) previousVisitOrDriver).getId() : ((PlanningVisit) previousVisitOrDriver).getId();
        String next = nextVisit == null ? "null" : nextVisit.getId();

        return "[" + visitType + "][OID: " + this.getOrderId() + "][" + getShortId() + "][idx=" + visitIndex + "] :: " + location + " [prev = " + prev + "][next = " + next + "]";
    }
}
