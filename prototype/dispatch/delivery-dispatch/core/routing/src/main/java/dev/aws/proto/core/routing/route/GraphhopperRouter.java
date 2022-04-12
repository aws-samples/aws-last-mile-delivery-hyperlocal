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
import com.uber.h3core.util.GeoCoord;
import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.IDistanceCalculator;
import dev.aws.proto.core.routing.location.Coordinate;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.StreamSupport;

import static java.util.stream.Collectors.toList;

/**
 * The Graphhopper router.
 * Performs distance calculations and gets paths between two lat/lng coordinates.
 */
public class GraphhopperRouter implements IDistanceCalculator {
    private static final Logger logger = LoggerFactory.getLogger(GraphhopperRouter.class);
    private static final RoundingMode roundingMode = RoundingMode.HALF_EVEN;

    /**
     * The allowed profiles for routing.
     * <p>
     * Currently, it supports two profiles:
     * - CAR
     * - MOTORCYCLE
     * <p>
     * IMPORTANT:
     * if you extend this, make sure the `graphhopper-settings.xml` files are updated with the additional profiles.
     */
    private static final String[] allowedProfiles = {FlagEncoderFactory.CAR, FlagEncoderFactory.MOTORCYCLE};

    /**
     * The hopper object.
     */
    private final GraphHopper graphhopper;

    /**
     * The selected routing profile.
     */
    private final String profile;

    /**
     * The number of decimal places for GPS coordinates.
     * <p>
     * If this value is set between 0 and 8 (inclusive), rounding will happen, otherwise, will be ignored.
     * <p>
     * {@see http://wiki.gis.com/wiki/index.php/Decimal_degrees}
     * | ---------------| ---------|
     * | Decimal places | Distance |
     * |              0 | 111 km   |
     * |              1 | 11.1 km  |
     * |              2 | 1.11 km  |
     * |              3 | 111 m    |
     * |              4 | 11.1 m   |
     * |              5 | 1.11 m   |
     * |              6 | 0.111 m  |
     * |              7 | 1.11 cm  |
     * |              8 | 1.11 mm  |
     * -----------------------------
     */
    private final int gpsAccuracy;

    /**
     * A counter to get information about routing errors.
     */
    @Getter
    private final AtomicInteger errorCnt;

    public GraphhopperRouter(GraphHopper graphhopper, String profile) {
        // don't use additional gps accuracy
        this(graphhopper, profile, -1);
    }

    public GraphhopperRouter(GraphHopper graphhopper, String profile, int gpsAccuracy) {
        if (graphhopper == null) {
            throw new IllegalArgumentException("Graphhopper router cannot be null.");
        }
        if (Arrays.stream(allowedProfiles).noneMatch(profile::equals)) {
            throw new IllegalArgumentException(
                    String.format("%s is not a supported profile. Allowed profile values are [%s]",
                            profile, String.join(", ", allowedProfiles)
                    )
            );
        }

        this.graphhopper = graphhopper;
        this.profile = profile;
        this.gpsAccuracy = gpsAccuracy;
        this.errorCnt = new AtomicInteger(0);
    }

    private GHResponse getRoute(double fromLat, double fromLng, double toLat, double toLng) {
        if (gpsAccuracy >= 0 && gpsAccuracy <= 8) {
            fromLat = BigDecimal.valueOf(fromLat).setScale(gpsAccuracy, roundingMode).doubleValue();
            fromLng = BigDecimal.valueOf(fromLng).setScale(gpsAccuracy, roundingMode).doubleValue();
            toLat = BigDecimal.valueOf(toLat).setScale(gpsAccuracy, roundingMode).doubleValue();
            toLng = BigDecimal.valueOf(toLng).setScale(gpsAccuracy, roundingMode).doubleValue();
        }

        logger.trace("getRoute between {}/{} and {}/{}", fromLat, fromLng, toLat, toLng);

        GHRequest ghRequest = new GHRequest(fromLat, fromLng, toLat, toLng);
        ghRequest.setProfile(this.profile);
        return graphhopper.route(ghRequest);
    }

    /**
     * Gets a routing path between two geo points.
     *
     * @param origin      The starting point.
     * @param destination The endpoint.
     * @return The list of points that define the travel path.
     */
    public List<Coordinate> getPath(Coordinate origin, Coordinate destination) {
        logger.trace("getPath between {} and {}", origin, destination);
        GHResponse ghResponse = this.getRoute(
                origin.getLatitude(), origin.getLongitude(), destination.getLatitude(), destination.getLongitude());

        PointList points = ghResponse.getBest().getPoints();
        return StreamSupport.stream(points.spliterator(), false)
                .map(ghPoint3D -> new Coordinate(ghPoint3D.lat, ghPoint3D.lon))
                .collect(toList());
    }

    @Override
    public Distance travelDistance(Coordinate from, Coordinate to) {
        return this.travelDistance(new GeoCoord(from.getLatitude(), from.getLongitude()), new GeoCoord(to.getLatitude(), to.getLongitude()));
    }

    /**
     * Gets the travel distance (in meters and in milliseconds) between two geo points.
     * <p>
     * If Graphhopper cannot determine the distance between the two points, will return `-1` values for the distance.
     * <p>
     *
     * @param from Origin location.
     * @param to   Destination location.
     * @return The distance between the origin and the destination.
     */
    public Distance travelDistance(GeoCoord from, GeoCoord to) {
        logger.trace("Calculating distance between {} and {}", from, to);

        GHResponse ghResponse = this.getRoute(from.lat, from.lng, to.lat, to.lng);

        if (ghResponse.hasErrors()) {
            for (Throwable err : ghResponse.getErrors()) {
                logger.debug("Error while calculating route between {}/{} and {}/{}: {}", from.lat, from.lng, to.lat, to.lng, err.getMessage());
                errorCnt.incrementAndGet();
            }

            return Distance.ofValue(-1, -1);
        }

        ResponsePath bestPath = ghResponse.getBest();
        return Distance.ofValue((long) bestPath.getDistance(), bestPath.getTime() / 1000L);
    }


}
