package dev.aws.proto.core.routing;


import lombok.Data;

@Data
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
    private SegmentRoute route;

}
