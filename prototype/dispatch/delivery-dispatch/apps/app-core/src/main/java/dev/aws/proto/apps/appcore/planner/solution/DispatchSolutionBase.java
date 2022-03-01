package dev.aws.proto.apps.appcore.planner.solution;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.optaplanner.core.api.score.AbstractScore;

import java.util.UUID;

@Data
public class DispatchSolutionBase<TScore extends AbstractScore> {
    @JsonProperty("dispatchingSolutionId")
    private UUID id;

    private String name;
    private long createdAt;
    private String executionId;
    private TScore score;
}
