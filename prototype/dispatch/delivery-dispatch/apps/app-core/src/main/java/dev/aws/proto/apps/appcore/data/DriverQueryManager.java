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

import dev.aws.proto.apps.appcore.config.DriverClientConfig;
import dev.aws.proto.apps.appcore.config.DriverQueryProperties;
import dev.aws.proto.core.routing.location.Coordinate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Base class for Driver Query operations
 *
 * @param <TAPIDriver>      The type that represents the driver data received from the REST API.
 * @param <TPlanningDriver> The type that represents the Planning Driver for the solver.
 */
public abstract class DriverQueryManager<TAPIDriver, TPlanningDriver> {
    private static final Logger logger = LoggerFactory.getLogger(DriverQueryManager.class);

    /**
     * The driver query rest client that consumes data from the REST API.
     *
     * @return The query client instance with the concrete type representing the API driver data.
     */
    protected abstract DriverQueryClient<TAPIDriver> getDriverQueryClient();

    /**
     * Config for the driver client.
     */
    @Inject
    protected DriverClientConfig driverClientConfig;

    /**
     * Properties for driver query parameters.
     */
    @Inject
    protected DriverQueryProperties driverQueryProperties;

    /**
     * Retrieves drivers around a list of locations.
     * For each location we limit the number of drivers retrieved.
     *
     * @param locations The list of locations to seek drivers around.
     * @param converter The function that converts data received from the API to the desired type.
     * @return The list of drivers in the desired type.
     */
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

        List<TAPIDriver> drivers = this.getDriverQueryClient().getAvailableDriversPerOrigin(driverQueryRequest);

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

    /**
     * Retrieves drivers around a centroid. If there any not enough drivers returned, the radius will be increased.
     *
     * @param centroid    The location to retrieve drivers around.
     * @param numOfOrders Number of orders to fulfill.
     * @param converter   The function that converts data received from the API to the desired type.
     * @return The list of drivers in the desired type.
     */
    public List<TPlanningDriver> retrieveDriversWithExtendingRadius(Coordinate centroid, int numOfOrders, Function<TAPIDriver, TPlanningDriver> converter) {

        int radius = driverQueryProperties.initialRadiusInM();
        int numOfDrivers = 0;
        int prevNumOfDrivers = -1;
        List<TAPIDriver> drivers = null;
        int requestCnt = 0;

        while (numOfDrivers < numOfOrders) {
            drivers = this.getDriverQueryClient().getAvailableDrivers(
                    "m", "IDLE",
                    centroid.getLatitude(), centroid.getLongitude(),
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

    /**
     * Calls the driver query API with multiple parameters.
     *
     * @param distanceUnit Distance unit (e.g. m, km, etc)
     * @param status       The allowed status of the drivers to retrieve
     * @param lat          Latitude of the centroid
     * @param lon          Longitude of the centroid
     * @param count        Minimum number of drivers to retrieve
     * @param radius       The radius around the centroid.
     * @return The list of drivers with the data format from the API.
     */
    public List<TAPIDriver> getDrivers(String distanceUnit, String status, double lat, double lon, int count, int radius) {
        return this.getDriverQueryClient().getAvailableDrivers(distanceUnit, status, lat, lon, count, radius);
    }

    /**
     * Calls the driver query API.
     *
     * @param locations        The list of locations to retrieve drivers around from.
     * @param countPerLocation The minimum number of drivers per location
     * @return The list of drivers with the data format from the API.
     */
    public List<TAPIDriver> getDriversAroundLocations(List<Coordinate> locations, int countPerLocation) {
        DriverQueryRequest driverQueryRequest = new DriverQueryRequest();
        driverQueryRequest.locations = locations;
        driverQueryRequest.countPerLocation = countPerLocation;
        driverQueryRequest.distance = 500;
        driverQueryRequest.distanceUnit = "m";
        driverQueryRequest.status = "IDLE";

        List<TAPIDriver> drivers = this.getDriverQueryClient().getAvailableDriversPerOrigin(driverQueryRequest);

        return drivers;
    }
}
