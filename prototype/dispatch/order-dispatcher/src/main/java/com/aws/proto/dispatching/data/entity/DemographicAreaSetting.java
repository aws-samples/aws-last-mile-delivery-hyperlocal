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
package com.aws.proto.dispatching.data.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DemographicAreaSetting {
    public String DemArea;
    public boolean olderOrdersCannotBeAssignedAfterFresher;
    public boolean preferCloserDriverToPickupLocation;
        public boolean preferOccupiedDrivers;

    public static DemographicAreaSetting from(Map<String, AttributeValue> item) {
        DemographicAreaSetting das = new DemographicAreaSetting();

        if (item != null && !item.isEmpty()) {
            das.DemArea = item.get("ID").s();
            das.olderOrdersCannotBeAssignedAfterFresher = item.get("olderOrdersCannotBeAssignedAfterFresher").bool();
            das.preferOccupiedDrivers = item.get("preferOccupiedDrivers").bool();
            das.preferCloserDriverToPickupLocation = item.get("preferCloserDriverToPickupLocation").bool();
        }

        return das;
    }

    public String getDemArea() { return DemArea; }
}
