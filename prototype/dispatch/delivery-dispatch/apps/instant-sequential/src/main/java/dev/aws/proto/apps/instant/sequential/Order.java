package dev.aws.proto.apps.instant.sequential;

import dev.aws.proto.core.routing.CoordinateWithId;
import lombok.Data;

import java.util.List;

@Data
public class Order extends dev.aws.proto.core.Order {

    @Data
    public static class Origin extends CoordinateWithId {
        private int preparationTimeInMins;
        private List<String> tags;
    }

    private CoordinateWithId destination;
    private Origin origin;
}