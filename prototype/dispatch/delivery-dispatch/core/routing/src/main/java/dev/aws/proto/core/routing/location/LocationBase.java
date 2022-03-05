package dev.aws.proto.core.routing.location;

import dev.aws.proto.core.routing.distance.Distance;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
public class LocationBase implements ILocation, Comparable<LocationBase> {
    private String id;
    private Coordinate coordinate;
    private LocationType locationType;
    private DistanceMatrix distanceMatrix;

    protected LocationBase(String id, Coordinate coordinate, LocationType locationType) {
        this.id = id;
        this.coordinate = coordinate;
        this.locationType = locationType;
    }

    public Distance distanceTo(ILocation other) {
        return this.distanceMatrix.distanceBetween(this, other);
    }

    @Override
    public Coordinate coordinate() {
        return this.coordinate;
    }

    @Override
    public int compareTo(LocationBase other) {
        return this.locationType.compareTo(other.locationType);
    }
}
