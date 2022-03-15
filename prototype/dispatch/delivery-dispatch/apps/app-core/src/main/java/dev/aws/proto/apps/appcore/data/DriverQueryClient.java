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

import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.jaxrs.QueryParam;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import java.util.List;

@Path("/api/geotracking/internal/driver-location")
//@RegisterRestClient(configKey = "app.client.driver-api")
@RegisterRestClient
@RegisterClientHeaders(ApiKeyHeaderFactory.class)
public interface DriverQueryClient<TDBDriver> {

    @GET
    @Path("/query")
    @Produces("application/json")
    List<TDBDriver> getAvailableDrivers(
            @QueryParam("distanceUnit") String distanceUnit,
            @QueryParam("status") String status,
            @QueryParam("lat") double lat,
            @QueryParam("long") double lon,
            @QueryParam("count") int count,
            @QueryParam("distance") int distance);

    @POST
    @Path("/query")
    @Produces("application/json")
    List<TDBDriver> getAvailableDriversPerOrigin(DriverQueryRequest driverQueryRequest);
}
