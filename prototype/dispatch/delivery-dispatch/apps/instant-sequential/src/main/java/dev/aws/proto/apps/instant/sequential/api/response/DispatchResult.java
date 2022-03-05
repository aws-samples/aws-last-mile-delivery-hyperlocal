package dev.aws.proto.apps.instant.sequential.api.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.UUID;

@Data
@SuperBuilder
public class DispatchResult extends dev.aws.proto.apps.appcore.api.response.DispatchResult {

    @Data
    public static class DistanceMatrixMetrics {
        private final long generatedTimeInMs;
        private final int dimension;
    }

    private UUID problemId;
    private String executionId;
    private long createdAt;
    private DistanceMatrixMetrics distanceMatrixMetrics;
    private String state;
    private String score;
    private long solverDurationInMs = -1L;
    private List<String> unassigned;
}
