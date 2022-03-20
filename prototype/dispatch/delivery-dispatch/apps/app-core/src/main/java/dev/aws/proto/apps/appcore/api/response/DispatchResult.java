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

package dev.aws.proto.apps.appcore.api.response;

import lombok.Data;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * The base class for a dispatch request's response.
 * <p>
 * It is highly encouraged that you extend this class in your custom domain implementation.
 */
@Data
@SuperBuilder
public class DispatchResult {
    /**
     * The generated problemId that's used to lookup the solver job.
     */
    private UUID problemId;

    /**
     * The timestamp of the dispatching request.
     */
    private long createdAt;

    /**
     * The solver's final score.
     */
    private String score;

    /**
     * The time (in milliseconds) took to solve the dispatching problem by the solver.
     */
    private long solverDurationInMs = -1L;

    /**
     * The dispatching job's state.
     */
    private String state;

}
