package dev.aws.proto.apps.appcore.api.response;

import dev.aws.proto.core.routing.route.DeliverySegment;
import lombok.Data;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@SuperBuilder
public class DispatchResult {
    private List<DeliverySegment> segments;
}
