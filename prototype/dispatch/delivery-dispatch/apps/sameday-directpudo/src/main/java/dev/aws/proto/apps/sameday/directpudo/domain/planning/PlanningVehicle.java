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

import dev.aws.proto.apps.sameday.directpudo.data.Parcel;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.CurrentCapacity;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.MaxCapacity;
import dev.aws.proto.apps.sameday.directpudo.location.HubLocation;
import dev.aws.proto.apps.sameday.directpudo.location.Location;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlanningVehicle extends PlanningBase<String> implements VisitOrVehicle {

    private HubLocation location;
    private MaxCapacity maxCapacity;

    // shadow variables
    private CurrentCapacity currentCapacity;
    private PlanningVisit nextPlanningVisit;

    // overrides
    @Override
    public Location getLocation() {
        return this.location;
    }

    @Override
    public PlanningVehicle getPlanningVehicle() {
        return this;
    }

    @Override
    public Integer getVisitIndex() {
        return 0;
    }

    @Override
    public Long getDeliveryDurationUntilNow() {
        return 0L;
    }

    @Override
    public PlanningVisit getNextPlanningVisit() {
        return this.nextPlanningVisit;
    }

//    @CustomShadowVariable(
//            variableListenerClass = CurrentCapacityUpdatingVariableListener.class,
//            sources = {@PlanningVariableReference(entityClass = PlanningVisit.class, variableName = Constants.PreviousVisitOrVehicle)}
//    )
//    public CurrentCapacity getCurrentCapacity() {
//        return this.currentCapacity;
//    }

    @Override
    public String toString() {
        return "[Driver][" + getId() + "] :: " + currentCapacity + " :: " + maxCapacity;
    }

    @Override
    public int hashCode() {
        return super.id.hashCode();
    }

    public long chainLength() {
        long len = 0;
        PlanningVisit visit = this.getNextPlanningVisit();

        while (visit != null) {
            len++;
            visit = visit.getNextPlanningVisit();
        }
        return len;
    }

    public int scoreForCapacityViolation() {
        CurrentCapacity currentCapacity = CurrentCapacity.ZERO;
        currentCapacity.setMaxCapacity(this.maxCapacity);

        PlanningVisit visit = this.getNextPlanningVisit();
        while (visit != null) {
            Parcel parcel = visit.getRide().getParcel();
            if (visit.getVisitType() == PlanningVisit.VisitType.PICKUP) {
                boolean success = currentCapacity.tryAddParcel(parcel);
                if (!success) {
                    return 1;
                }
            } else {
                currentCapacity.removeParcel(parcel);
            }

            visit = visit.getNextPlanningVisit();
        }

        return 0;
    }
}
