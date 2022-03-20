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

import org.jboss.resteasy.annotations.jaxrs.QueryParam;

import java.util.List;

/**
 * Base interface for driver query REST client.
 *
 * @param <TAPIDriver> The type representing the data coming from the API
 */
public interface DriverQueryClient<TAPIDriver> {

    /**
     * Calls the driver query API with multiple parameters.
     *
     * @param distanceUnit Distance unit (e.g. m, km, etc)
     * @param status       The allowed status of the drivers to retrieve
     * @param lat          Latitude of the centroid
     * @param lon          Longitude of the centroid
     * @param count        Minimum number of drivers to retrieve
     * @param distance     The radius around the centroid.
     * @return The list of drivers with the data format from the API.
     */
    List<TAPIDriver> getAvailableDrivers(
            @QueryParam("distanceUnit") String distanceUnit,
            @QueryParam("status") String status,
            @QueryParam("lat") double lat,
            @QueryParam("long") double lon,
            @QueryParam("count") int count,
            @QueryParam("distance") int distance);

    /**
     * Calls the driver query API
     *
     * @param driverQueryRequest The query request object (with multiple locations).
     * @return The list of drivers with the data format from the API.
     */
    List<TAPIDriver> getAvailableDriversPerOrigin(DriverQueryRequest driverQueryRequest);
}
