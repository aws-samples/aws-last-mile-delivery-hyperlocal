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
package dev.aws.proto.core.routing.route;

import com.graphhopper.GHRequest;
import com.graphhopper.GHResponse;
import com.graphhopper.GraphHopper;
import com.graphhopper.ResponsePath;
import com.graphhopper.routing.util.FlagEncoderFactory;
import com.graphhopper.util.PointList;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.IDistanceCalculator;
import dev.aws.proto.core.routing.location.Coordinate;
import io.vertx.core.impl.ConcurrentHashSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Set;
import java.util.stream.StreamSupport;

import static java.util.stream.Collectors.toList;

public class GraphhopperRouter implements IRouter, IDistanceCalculator {

    private static final Logger logger = LoggerFactory.getLogger(GraphhopperRouter.class);

    private final GraphHopper graphhopper;

    private final Set<String> errors = new ConcurrentHashSet<>();

    public GraphhopperRouter(GraphHopper graphhopper) {
        if (graphhopper == null) {
            throw new IllegalArgumentException("Graphhopper router cannot be null.");
        }

        this.graphhopper = graphhopper;
    }

    public Set<String> errors() {
        return errors;
    }

    public void clearErrors() {
        errors.clear();
    }

    @Override
    public List<Coordinate> getPath(Coordinate origin, Coordinate destination) {
        logger.trace("getPath between {} and {}", origin, destination);
        GHResponse ghResponse = this.getRoute(origin, destination);

        PointList points = ghResponse.getBest().getPoints();
        return StreamSupport.stream(points.spliterator(), false)
                .map(ghPoint3D -> new Coordinate(ghPoint3D.lat, ghPoint3D.lon))
                .collect(toList());
    }

    private GHResponse getRoute(Coordinate origin, Coordinate destination) {
        logger.trace("getRoute between {} and {}", origin, destination);
        GHRequest ghRequest = new GHRequest(
                origin.getLatitude(),
                origin.getLongitude(),
                destination.getLatitude(),
                destination.getLongitude());

        // TODO: in prod, this must be a parameter
        ghRequest.setProfile(FlagEncoderFactory.MOTORCYCLE);
//        ghRequest.setProfile(FlagEncoderFactory.CAR);

        GHResponse ghResponse = graphhopper.route(ghRequest);
        return ghResponse;
    }

    @Override
    public Distance travelDistance(Coordinate from, Coordinate to) {
        logger.trace("Calculating travel distance between {} and {}", from, to);
        GHResponse ghResponse = this.getRoute(from, to);
        // TODO: return wrapper that can hold both the result and error explanation instead of throwing exception
        if (ghResponse.hasErrors()) {
//            logger.error("Error while calculating distance: " + ghResponse.getErrors().get(0).getMessage());
//            throw new DistanceCalculationException("No route", ghResponse.getErrors().get(0));
            logger.debug("There were {} errors while GH request", ghResponse.getErrors().size());
            for (Throwable err : ghResponse.getErrors()) {
                errors.add(err.getMessage());
            }

            return Distance.ofValue(Long.MAX_VALUE, Long.MAX_VALUE);
        }

        long lengthDistance = IDistanceCalculator.travelDistanceSelector(ghResponse.getBest(), ResponsePath::getDistance).longValue();
        long timeDistance = IDistanceCalculator.travelDistanceSelector(ghResponse.getBest(), ResponsePath::getTime);
        return Distance.ofValue(lengthDistance, timeDistance);
    }


}
