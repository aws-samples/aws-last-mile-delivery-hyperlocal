package dev.aws.proto.core.routing.location;

import lombok.Data;

@Data
public class CoordinateWithId extends Coordinate {
    private String id;
}
