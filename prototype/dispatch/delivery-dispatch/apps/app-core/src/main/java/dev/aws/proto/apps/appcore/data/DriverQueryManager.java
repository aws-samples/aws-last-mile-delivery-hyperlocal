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
package dev.aws.proto.apps.appcore.data;

import dev.aws.proto.apps.appcore.config.DriverClientProperties;
import dev.aws.proto.apps.appcore.config.DriverQueryProperties;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.util.aws.SsmUtility;
import org.eclipse.microprofile.rest.client.RestClientBuilder;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

@ApplicationScoped
//@SuppressWarnings("unchecked")
public class DriverQueryManager<TAPIDriver, TPlanningDriver> {
    private static final Logger logger = LoggerFactory.getLogger(DriverQueryManager.class);

    @RestClient
    DriverQueryClient<TAPIDriver> driverQueryClient;

    @Inject
    DriverClientProperties driverClientProperties;

    @Inject
    DriverQueryProperties driverQueryProperties;

    DriverQueryManager(DriverClientProperties driverClientProperties, DriverQueryProperties driverQueryProperties) {
        this.driverClientProperties = driverClientProperties;
        this.driverQueryProperties = driverQueryProperties;

        String driverApiUrl = SsmUtility.getParameterValue(driverClientProperties.driverApiUrlParameterName());

        this.driverQueryClient = (DriverQueryClient<TAPIDriver>) RestClientBuilder.newBuilder()
                .baseUri(URI.create(driverApiUrl))
                .build(DriverQueryClient.class);
    }

    public List<TPlanningDriver> retrieveDriversAroundLocations(List<Coordinate> locations, Function<TAPIDriver, TPlanningDriver> converter) {
        // TODO: review this
        int countPerLocation = 3;
        if (locations.size() > 30) {
            countPerLocation = 2;
        }

        DriverQueryRequest driverQueryRequest = new DriverQueryRequest();
        driverQueryRequest.locations = locations;
        driverQueryRequest.countPerLocation = countPerLocation;
        driverQueryRequest.distance = 500;
        driverQueryRequest.distanceUnit = "m";
        driverQueryRequest.status = "IDLE";

        List<TAPIDriver> drivers = driverQueryClient.getAvailableDriversPerOrigin(driverQueryRequest);

        if (drivers == null || drivers.size() == 0) {
            return new ArrayList<>();
        }

        List<TPlanningDriver> planningDrivers = new ArrayList<>();
        for (TAPIDriver driver : drivers) {
            TPlanningDriver planningDriver = converter.apply(driver);
            planningDrivers.add(planningDriver);
        }

        logger.debug("Retrieved {} IDLE drivers - from around each origin", planningDrivers.size());

        return planningDrivers;
    }

    public List<TPlanningDriver> retrieveDriversWithExtendingRadius(Coordinate centroid, int numOfOrders, Function<TAPIDriver, TPlanningDriver> converter) {

        int radius = driverQueryProperties.initialRadiusInM();
        int numOfDrivers = 0;
        int prevNumOfDrivers = -1;
        List<TAPIDriver> drivers = null;
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

        List<TPlanningDriver> planningDrivers = new ArrayList<>();
        for (TAPIDriver driver : drivers) {
            TPlanningDriver planningDriver = converter.apply(driver);

            planningDrivers.add(planningDriver);
        }

        logger.debug("Retrieved {} IDLE drivers", planningDrivers.size());

        return planningDrivers;
    }

    public List<TAPIDriver> getDrivers(String distanceUnit, String status, double lat, double lon, int count, int radius) {
        return driverQueryClient.getAvailableDrivers(distanceUnit, status, lat, lon, count, radius);
    }

    public List<TAPIDriver> getDriversAroundLocations(List<Coordinate> locations, int countPerLocation) {
        DriverQueryRequest driverQueryRequest = new DriverQueryRequest();
        driverQueryRequest.locations = locations;
        driverQueryRequest.countPerLocation = countPerLocation;
        driverQueryRequest.distance = 500;
        driverQueryRequest.distanceUnit = "m";
        driverQueryRequest.status = "IDLE";

        List<TAPIDriver> drivers = driverQueryClient.getAvailableDriversPerOrigin(driverQueryRequest);

        return drivers;
    }
}
