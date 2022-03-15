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
package dev.aws.proto.apps.instant.sequential.domain.planning;

import dev.aws.proto.apps.instant.sequential.util.Constants;
import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.variable.InverseRelationShadowVariable;

@PlanningEntity
public interface DeliveryOrDriver {
    /**
     * Get the driver assigned to this planning entity.
     *
     * @return The PlanningDriver. Sometimes {@code null}.
     */
    PlanningDriver getPlanningDriver();

    /**
     * Get the next delivery assigned to this planning entity
     *
     * @return The next PlanningDelivery. Sometimes {@code null}.
     */
    @InverseRelationShadowVariable(sourceVariableName = Constants.PreviousDeliveryOrDriver)
    PlanningDelivery getNextPlanningDelivery();

    /**
     * Set the next PlanningDelivery to this planning entity.
     *
     * @param nextPlanningDelivery The next planning delivery (DestinationVisit, OriginVisit instance)
     */
    void setNextPlanningDelivery(PlanningDelivery nextPlanningDelivery);

    /**
     * Indicates whether the representing instance is a PlanningDriver.
     * @return true if it's a PlanningDriver; false if it's a PlanningDelivery
     */
    boolean isDriver();
}
