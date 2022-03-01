package dev.aws.proto.core;

import lombok.Data;

@Data
public class Order {
    private long createdAt;
    private String orderId;
    private String state;
}
