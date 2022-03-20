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

import org.optaplanner.core.api.solver.SolverJob;

/**
 * The state of the Optaplanner solution.
 *
 * @param <TSolution>  The type of the solution.
 * @param <TProblemId> The type of the problem ID.
 */
public class SolutionState<TSolution, TProblemId> {
    /**
     * The Optaplanner solver job.
     */
    public SolverJob<TSolution, TProblemId> solverJob;

    /**
     * The problem ID.
     */
    public TSolution problem;

    /**
     * Timestamp to indicate when the problem is starting to be solved.
     */
    public long startTimestamp;

    public SolutionState(SolverJob<TSolution, TProblemId> solverJob, TSolution problem, long startTimestamp) {
        this.solverJob = solverJob;
        this.problem = problem;
        this.startTimestamp = startTimestamp;
    }
}
