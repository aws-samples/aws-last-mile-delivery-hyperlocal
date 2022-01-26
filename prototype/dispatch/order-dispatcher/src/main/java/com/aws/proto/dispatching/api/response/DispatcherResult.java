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
package com.aws.proto.dispatching.api.response;

import com.aws.proto.dispatching.domain.location.LocationBase;
import com.aws.proto.dispatching.domain.location.LocationType;
import com.aws.proto.dispatching.routing.Coordinates;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.optaplanner.core.api.solver.SolverStatus;

import javax.json.bind.annotation.JsonbProperty;
import java.util.*;

public class DispatcherResult {
    public static class Visit {
        public LocationType type;
        public String id;
        public double lat;
        @JsonProperty("long")
        @JsonbProperty("long")
        public double lon;

        public Visit() {}

        public Visit(LocationType type, String id, double lat, double lon) {
            this.type = type;
            this.id = id;
            this.lat = lat;
            this.lon = lon;
        }
        public Visit(LocationBase loc) {
            this.type = loc.getLocationType();
            this.id = loc.getId();
            this.lat = loc.getCoordinates().latitude().doubleValue();
            this.lon = loc.getCoordinates().longitude().doubleValue();
        }
    }

    public static class LatLong {
        public double lat;

        @JsonProperty("long")
        @JsonbProperty("long")
        public double lon;

        public LatLong() {}

        public LatLong(Coordinates coordinates) {
            this.lat = coordinates.getLatitude().doubleValue();
            this.lon = coordinates.getLongitude().doubleValue();
        }
    }

    public static class DistanceMatrixMetrics {
        public long generatedTimeInMs;
        public int dimension;

        public DistanceMatrixMetrics() {}

        public DistanceMatrixMetrics(long generatedTimeInMs, int dimension) {
            this.generatedTimeInMs = generatedTimeInMs;
            this.dimension = dimension;
        }
    }

    public static class AssignedOrders {
        public String driverId;
        public String driverIdentity;
        public LatLong driverLocation;
        public List<String> orders;
        public List<Visit> route;

        public AssignedOrders() {}

        public AssignedOrders(String driverId, String driverIdentity, LocationBase driverLocation, List<String> orders, List<Visit> route) {
            this.driverId = driverId;
            this.driverIdentity = driverIdentity;
            this.driverLocation = new LatLong(driverLocation.getCoordinates());
            this.orders = orders;
            this.route = route;
        }
    }

    public List<AssignedOrders> assigned;
    public List<String> unassigned;

    public UUID problemId;
    public String executionId;
    public Long createdAt;
    public DistanceMatrixMetrics distanceMatrixMetrics;
    public String state;
    public String score;
    public Long solverDurationInMs = -1L;

    public DispatcherResult() {}

    public DispatcherResult(UUID problemId, String executionId, Long createdAt, SolverStatus solverStatus) {
        this.problemId = problemId;
        this.executionId = executionId;
        this.createdAt = createdAt;
        this.assigned = new ArrayList<>();
        this.unassigned = new ArrayList<>();
        this.state = solverStatus.name();
        this.score = "";
    }

    public DispatcherResult(UUID problemId, String executionId, Long createdAt, List<AssignedOrders> assigned, List<String> unassigned, String state, String score) {
        this.problemId = problemId;
        this.executionId = executionId;
        this.createdAt = createdAt;
        this.assigned = assigned;
        this.unassigned = unassigned;
        this.state = state;
        this.score = score;
    }


}
