package dev.aws.proto.core.routing.route;

import dev.aws.proto.core.routing.distance.Distance;
import lombok.Data;

@Data
public class SegmentRoute extends Distance {
    private String points;
}
