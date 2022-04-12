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

package dev.aws.proto.apps.sameday.directpudo.domain.planning.solver;

import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.VisitOrDriver;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import org.optaplanner.core.api.domain.variable.VariableListener;
import org.optaplanner.core.api.score.director.ScoreDirector;

import java.util.Objects;

public class VisitIndexUpdatingVariableListener implements VariableListener<DispatchSolution, PlanningVisit> {
    @Override
    public void beforeEntityAdded(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        // do nothing
    }

    @Override
    public void afterEntityAdded(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        updateVisit(scoreDirector, planningVisit);
    }

    @Override
    public void beforeVariableChanged(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        // do nothing
    }

    @Override
    public void afterVariableChanged(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        updateVisit(scoreDirector, planningVisit);
    }

    @Override
    public void beforeEntityRemoved(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        // do nothing
    }

    @Override
    public void afterEntityRemoved(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit planningVisit) {
        // do nothing
    }

    private void updateVisit(ScoreDirector<DispatchSolution> scoreDirector, PlanningVisit sourceVisit) {
        VisitOrDriver previousVisitOrDriver = sourceVisit.getPreviousVisitOrDriver();

        Integer visitIdx;

        if (previousVisitOrDriver == null) { // sourceVisit was the anchor, aka a driver
            visitIdx = null;
        } else { // sourceVisit was a visit
            visitIdx = previousVisitOrDriver.getVisitIndex();
            if (visitIdx != null) { // sourceVisit was the first visit, so its previous was the driver that has null visitIdx
                visitIdx++;
            }
        }

        // maintain a reference to the previous item in the chain
        PlanningVisit shadowVisit = sourceVisit;

        // until we reach the end of the chain AND visitIdx_prev != visitIdx_curr
        while (shadowVisit != null && !Objects.equals(shadowVisit.getVisitIndex(), visitIdx)) {
            // change the visitIndex of the current node
            scoreDirector.beforeVariableChanged(shadowVisit, "visitIndex");
            shadowVisit.setVisitIndex(visitIdx);
            scoreDirector.afterVariableChanged(shadowVisit, "visitIndex");

            // move to the next node in the chain
            shadowVisit = shadowVisit.getNextVisit();
            if (visitIdx != null) {
                visitIdx++;
            }
        }
    }
}
