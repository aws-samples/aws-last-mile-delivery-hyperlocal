package dev.aws.proto.apps.appcore.api.response;

import lombok.Data;

@Data
public class RequestResult {
    private String problemId;
    private String error;
}
