package dev.aws.proto.apps.appcore.api.request;

import dev.aws.proto.core.Order;
import lombok.Data;

@Data
public class DispatchRequest<TOrder extends Order> {
    private String executionId;
    private TOrder[] orders;
}
