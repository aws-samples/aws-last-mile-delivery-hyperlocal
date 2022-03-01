package dev.aws.proto.apps.instant.sequential.api.response;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class DispatchResult extends dev.aws.proto.apps.appcore.api.response.DispatchResult {

    @Data
    public static class DistanceMatrixMetrics {
        private long generatedTimeInMs;
        private int dimension;
    }

    private String driverId;
    private UUID problemId;
    private String executionId;
    private long createdAt;
    private DistanceMatrixMetrics distanceMatrixMetrics;
    private String state;
    private String score;
    private long solverDurationInMs = -1L;
    private List<String> unassigned;
}
