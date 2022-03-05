package dev.aws.proto.apps.appcore.planner.solution;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.optaplanner.core.api.score.AbstractScore;

import java.util.UUID;

@Data
public abstract class DispatchSolutionBase<TScore extends AbstractScore> {
    @JsonProperty("dispatchingSolutionId")
    protected UUID id;

    protected String name;
    protected long createdAt;
    protected String executionId;
    protected TScore score;
}
