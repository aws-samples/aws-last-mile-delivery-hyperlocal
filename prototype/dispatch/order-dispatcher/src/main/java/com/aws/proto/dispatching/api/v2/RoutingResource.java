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
package com.aws.proto.dispatching.api.v2;

import com.aws.proto.dispatching.api.request.DistanceBetweenLocationsRequest;
import com.aws.proto.dispatching.config.RoutingConfig;
import com.aws.proto.dispatching.routing.Coordinates;
import com.aws.proto.dispatching.routing.Distance;
import com.aws.proto.dispatching.routing.GraphhopperRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Singleton
@Path("/v2/test/routing")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RoutingResource {
    private static final Logger logger = LoggerFactory.getLogger(RoutingResource.class);

    @Inject
    RoutingConfig routingConfig;

    GraphhopperRouter graphhopperRouter;

    @Inject
    public RoutingResource(RoutingConfig routingConfig) {
        this.routingConfig = routingConfig;
        this.graphhopperRouter = new GraphhopperRouter(routingConfig.graphHopper());
    }

    @POST
    @Path("distance-between-locations")
    public Distance distanceBetweenLocations(DistanceBetweenLocationsRequest req) {
        Distance dist = this.graphhopperRouter.travelDistance(Coordinates.valueOf(req.origin.lat, req.origin.lon), Coordinates.valueOf(req.destination.lat, req.destination.lon));

        if(this.graphhopperRouter.errors().size() > 0) {
            this.graphhopperRouter.errors().forEach(logger::warn);
            this.graphhopperRouter.clearErrors();
        }

        logger.info("{}", dist);
        return dist;
    }
}
