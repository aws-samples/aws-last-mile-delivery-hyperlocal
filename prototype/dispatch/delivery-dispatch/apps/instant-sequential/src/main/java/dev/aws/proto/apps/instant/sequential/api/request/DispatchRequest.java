package dev.aws.proto.apps.instant.sequential.api.request;

import dev.aws.proto.apps.instant.sequential.Order;
import dev.aws.proto.core.routing.location.Coordinate;
import lombok.Data;

@Data
public class DispatchRequest extends dev.aws.proto.apps.appcore.api.request.DispatchRequest<Order> {
    private Coordinate centroid;
}
