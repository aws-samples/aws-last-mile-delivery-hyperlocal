package dev.aws.proto.core.routing.route;


import dev.aws.proto.core.routing.location.Coordinate;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeliverySegment {

    public static enum SegmentType {
        TO_ORIGIN,
        TO_DESTINATION,
        TO_WAREHOUSE,
    }

    private String orderId;
    private int index;
    private Coordinate from;
    private Coordinate to;
    private SegmentType segmentType;
    private SegmentRoute route;

}
