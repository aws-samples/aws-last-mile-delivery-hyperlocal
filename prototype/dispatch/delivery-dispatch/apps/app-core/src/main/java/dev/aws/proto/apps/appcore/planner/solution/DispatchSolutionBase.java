/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package dev.aws.proto.apps.appcore.planner.solution;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.optaplanner.core.api.score.AbstractScore;

import java.util.UUID;

/**
 * Base class that represents a dispatching solution.
 * Extend this class while implementing your own model for your own domain.
 *
 * @param <TScore> The score type for the solution. {@see https://docs.optaplanner.org/8.17.0.Final/optaplanner-docs/html_single/index.html#scoreCalculation}
 */
@Data
@NoArgsConstructor
public abstract class DispatchSolutionBase<TScore extends AbstractScore> {
    /**
     * The unique identifier for the solution.
     */
    @JsonProperty("dispatchingSolutionId")
    protected UUID id;

    /**
     * The name of the dispatching solution.
     */
    protected String name;

    /**
     * Timestamp of the creation of this solution.
     */
    protected long createdAt;

    /**
     * Step function execution ID.
     */
    protected String executionId;

    /**
     * Solver score for the solution.
     */
    protected TScore score;
}
