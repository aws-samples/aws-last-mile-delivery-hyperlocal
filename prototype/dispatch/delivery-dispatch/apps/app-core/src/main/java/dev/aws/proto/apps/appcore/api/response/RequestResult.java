package dev.aws.proto.apps.appcore.api.response;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor(staticName = "of")
public class RequestResult {
    private final String problemId;
    private String error;
}
