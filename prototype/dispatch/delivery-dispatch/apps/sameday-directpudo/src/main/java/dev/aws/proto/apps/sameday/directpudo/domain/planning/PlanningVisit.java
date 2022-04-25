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
    private VisitOrVehicle previousVisitOrVehicle;

    // shadow variables
    private PlanningVehicle planningVehicle;
    private PlanningVisit nextPlanningVisit;
    private Integer visitIndex;
    private Long deliveryDurationUntilNow;

    // getters/setters overrides

    @Override
    public Location getLocation() {
        return this.location;
    }

    // TODO: maybe add getParcelSize

    @DeepPlanningClone
    @PlanningVariable(
            valueRangeProviderRefs = {Constants.PlanningVehicleRange, Constants.PlanningVisitRange},
            graphType = PlanningVariableGraphType.CHAINED
    )
    public VisitOrVehicle getPreviousVisitOrVehicle() {
        return this.previousVisitOrVehicle;
    }

    @Override
    public PlanningVisit getNextPlanningVisit() {
        return this.nextPlanningVisit;
    }

    @AnchorShadowVariable(sourceVariableName = Constants.PreviousVisitOrVehicle)
    public PlanningVehicle getPlanningVehicle() {
        return this.planningVehicle;
    }

    @CustomShadowVariable(
            variableListenerClass = VisitIndexUpdatingVariableListener.class,
            sources = {@PlanningVariableReference(variableName = Constants.PreviousVisitOrVehicle)}
    )
    public Integer getVisitIndex() {
        return this.visitIndex;
    }

    //    @CustomShadowVariable(
//            variableListenerRef = @PlanningVariableReference(variableName = "visitIndex")
//    )
    public Long getDeliveryDurationUntilNow() {
        return this.deliveryDurationUntilNow;
    }

    // todo: add distanceTo() method

    public String getPlanningVehicleId() {
        return planningVehicle == null ?
                this.id + "-VEHICLE" : planningVehicle.getId();
    }

    @Override
    public int hashCode() {
        return super.id.hashCode();
    }

    @Override
    public String toString() {
        String prev = previousVisitOrVehicle == null ? "null" :
                previousVisitOrVehicle instanceof PlanningVehicle ? "Vehicle" + ((PlanningVehicle) previousVisitOrVehicle).getId() : ((PlanningVisit) previousVisitOrVehicle).getId();
        String next = nextPlanningVisit == null ? "null" : nextPlanningVisit.getShortId();

        String durationFromPrev = previousVisitOrVehicle == null ? "null" :
                previousVisitOrVehicle instanceof PlanningVehicle ?
                        String.valueOf(((PlanningVehicle) previousVisitOrVehicle).getLocation().distanceTo(this.getLocation()).getDistanceInSeconds()) :
                        String.valueOf(((PlanningVisit) previousVisitOrVehicle).getLocation().distanceTo(this.getLocation()).getDistanceInSeconds());

        return "[visit[" + getId() + "]] [" + visitType + "][order=" + this.getOrderId() + "][idx=" + visitIndex + "]\t[durationUntilNowInSec=" + deliveryDurationUntilNow + "][durFromPrev= " + durationFromPrev + "]\t[prev = " + prev + "][next = " + next + "]";
    }

    public int scoreForDistanceFromPreviousVisitOrVehicle() {
        if (previousVisitOrVehicle == null) {
            throw new IllegalStateException("This method should not be called when the previousVisitOrDriver is not initialized yet.");
        }

        TravelDistance distance = this.location.distanceTo(previousVisitOrVehicle.getLocation());
        return (int) distance.getDistanceInMeters();
    }

    public boolean isLastVisit() {
        return this.nextPlanningVisit == null;
    }

    public int scoreForDistanceFromLastVisitToHub() {
        if (!isLastVisit()) {
            throw new IllegalStateException("This method should not be called when this visit is not the last one");
        }

        TravelDistance distance = this.location.distanceTo(this.getPlanningVehicle().getLocation());
        return (int) distance.getDistanceInMeters();
    }

    public int scoreForMaxDurationOfDeliveryJob() {
        int secDiff = (int) (this.deliveryDurationUntilNow - Constants.MaxDurationOfDeliveryJobInSeconds);
        return Math.max(secDiff, 0);
    }
}
