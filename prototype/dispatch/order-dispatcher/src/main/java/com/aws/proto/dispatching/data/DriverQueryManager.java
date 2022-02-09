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
package com.aws.proto.dispatching.data;

import com.aws.proto.dispatching.config.DriverQueryProperties;
import com.aws.proto.dispatching.data.entity.DriverQueryRequest;
import com.aws.proto.dispatching.data.entity.InputDriverData;
import com.aws.proto.dispatching.domain.location.DriverLocation;
import com.aws.proto.dispatching.domain.planningentity.base.PlanningDriverBase;
import com.aws.proto.dispatching.routing.Coordinates;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class DriverQueryManager {
    private static final Logger logger = LoggerFactory.getLogger(DriverQueryManager.class);

    @Inject
    @RestClient
    DriverQueryClient driverQueryClient;

    @Inject
    DriverQueryProperties driverQueryProperties;

    public List<PlanningDriverBase> retrieveDriversAroundLocations(List<Coordinates> locations) {
        int countPerLocation = 3;
        if (locations.size() > 30) {
            countPerLocation = 2;
        }

        DriverQueryRequest driverQueryRequest = new DriverQueryRequest();
        driverQueryRequest.locations = locations.stream().map(c -> {
            return new DriverQueryRequest.LatLong(c);
        }).collect(Collectors.toList());
        driverQueryRequest.countPerLocation = countPerLocation;
        driverQueryRequest.distance = 500;
        driverQueryRequest.distanceUnit = "m";
        driverQueryRequest.status = "IDLE";

        List<InputDriverData> drivers = driverQueryClient.getAvailableDriversPerOrigin(driverQueryRequest);

        if (drivers == null || drivers.size() == 0) {
            return new ArrayList<>();
        }

        List<PlanningDriverBase> planningDrivers = new ArrayList<>();
        for (InputDriverData driver : drivers) {
            DriverLocation driverLocation = new DriverLocation(driver.driverId, Coordinates.valueOf(driver.lat, driver.lon), driver.timestamp);
            PlanningDriverBase planningDriver = new PlanningDriverBase(driver.driverId, driver.driverIdentity, driverLocation, driver.status);

            planningDrivers.add(planningDriver);
        }

        logger.debug("Retrieved {} IDLE drivers - from around each origin", planningDrivers.size());

//        logger.warn("returning only 3 drivers");
//        return planningDrivers.stream().limit(3).collect(Collectors.toList());
        return planningDrivers;
    }

    public List<PlanningDriverBase> retrieveDriversWithExtendingRadius(Coordinates centroid, int numOfOrders) {

        int radius = driverQueryProperties.initialRadiusInM();
        int numOfDrivers = 0;
        int prevNumOfDrivers = -1;
        List<InputDriverData> drivers = null;
        int requestCnt = 0;

        while (numOfDrivers < numOfOrders) {
            drivers = driverQueryClient.getAvailableDrivers(
                    "m", "IDLE",
                    centroid.getLatitude().doubleValue(), centroid.getLongitude().doubleValue(),
                    numOfOrders + 5,
                    radius);

            int newNumOfDrivers = drivers.size();
            requestCnt++;
            logger.trace("[driver# = {}][prev# = {}][radius = {}]", numOfDrivers, prevNumOfDrivers, radius);

            if (prevNumOfDrivers >= newNumOfDrivers && prevNumOfDrivers > 0) {
                break;
            } else {
                radius += driverQueryProperties.extendRadiusInM();
                prevNumOfDrivers = numOfDrivers;
                numOfDrivers = newNumOfDrivers;
            }

            if (requestCnt > driverQueryProperties.maxRequestCount()) {
                break;
            }
        }

        logger.debug("[driver# = {}][prev# = {}][radius = {}][req# = {}]", numOfDrivers, prevNumOfDrivers, radius, requestCnt);

        if (drivers == null) {
            return new ArrayList<>();
        }

        List<PlanningDriverBase> planningDrivers = new ArrayList<>();
        for (InputDriverData driver : drivers) {
            DriverLocation driverLocation = new DriverLocation(driver.driverId, Coordinates.valueOf(driver.lat, driver.lon), driver.timestamp);
            PlanningDriverBase planningDriver = new PlanningDriverBase(driver.driverId, driver.driverIdentity, driverLocation, driver.status);

            planningDrivers.add(planningDriver);
        }

        logger.debug("Retrieved {} IDLE drivers", planningDrivers.size());

//        logger.warn("returning only 3 drivers");
//        return planningDrivers.stream().limit(3).collect(Collectors.toList());
        return planningDrivers;
    }

    public List<InputDriverData> getDrivers(String distanceUnit, String status, double lat, double lon, int count, int radius) {
        return driverQueryClient.getAvailableDrivers(distanceUnit, status, lat, lon, count, radius);
    }

    public List<InputDriverData> getDriversAroundLocations(List<Coordinates> locations, int countPerLocation) {
        DriverQueryRequest driverQueryRequest = new DriverQueryRequest();
        driverQueryRequest.locations = locations.stream().map(c -> {
            return new DriverQueryRequest.LatLong(c);
        }).collect(Collectors.toList());
        driverQueryRequest.countPerLocation = countPerLocation;
        driverQueryRequest.distance = 500;
        driverQueryRequest.distanceUnit = "m";
        driverQueryRequest.status = "IDLE";

        List<InputDriverData> drivers = driverQueryClient.getAvailableDriversPerOrigin(driverQueryRequest);

        return drivers;
    }
}
