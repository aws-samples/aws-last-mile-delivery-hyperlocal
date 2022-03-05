package dev.aws.proto.apps.instant.sequential.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.apps.instant.sequential.location.DriverLocation;
import dev.aws.proto.core.routing.location.Coordinate;
import lombok.Data;

import javax.json.bind.annotation.JsonbProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
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
