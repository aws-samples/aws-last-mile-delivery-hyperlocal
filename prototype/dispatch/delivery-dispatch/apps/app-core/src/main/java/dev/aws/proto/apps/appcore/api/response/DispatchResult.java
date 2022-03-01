package dev.aws.proto.apps.appcore.api.response;

import dev.aws.proto.core.routing.DeliverySegment;
import lombok.Data;

import java.util.List;

@Data
public class DispatchResult {
    private List<DeliverySegment> segments;
}
