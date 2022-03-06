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

package dev.aws.proto.apps.instant.sequential.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.location.DriverLocation;
import dev.aws.proto.core.routing.location.Coordinate;
import lombok.Data;

import javax.json.bind.annotation.JsonbProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class ApiDriver {
    public String driverId;
    public String driverIdentity;
    public long timestamp;

    @JsonProperty("latitude")
    @JsonbProperty("latitude")
    public double lat;

    @JsonProperty("longitude")
    @JsonbProperty("longitude")
    public double lon;

    public String status;
    public String distanceUnit;
    public double distance;

    public static PlanningDriver convertToPlanningDriver(ApiDriver driver) {
        return PlanningDriver.builder()
                .id(driver.driverId)
                .driverIdentity(driver.driverIdentity)
                .location(new DriverLocation(driver.driverId, new Coordinate(driver.lat, driver.lon), driver.timestamp))
                .status(driver.status)
                .build();
    }
}
