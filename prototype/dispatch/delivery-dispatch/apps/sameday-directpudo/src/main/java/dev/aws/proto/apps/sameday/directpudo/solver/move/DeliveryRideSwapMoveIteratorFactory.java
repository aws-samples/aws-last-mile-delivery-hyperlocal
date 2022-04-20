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

package dev.aws.proto.apps.sameday.directpudo.solver.move;

import dev.aws.proto.apps.sameday.directpudo.domain.planning.DeliveryRide;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningVisit;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import dev.aws.proto.apps.sameday.directpudo.util.Constants;
import lombok.AllArgsConstructor;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
import org.optaplanner.core.api.score.director.ScoreDirector;
import org.optaplanner.core.impl.domain.variable.descriptor.GenuineVariableDescriptor;
import org.optaplanner.core.impl.domain.variable.inverserelation.SingletonInverseVariableDemand;
import org.optaplanner.core.impl.domain.variable.inverserelation.SingletonInverseVariableSupply;
import org.optaplanner.core.impl.heuristic.move.CompositeMove;
import org.optaplanner.core.impl.heuristic.move.Move;
import org.optaplanner.core.impl.heuristic.selector.move.factory.MoveIteratorFactory;
import org.optaplanner.core.impl.heuristic.selector.move.generic.chained.ChainedSwapMove;
import org.optaplanner.core.impl.score.director.InnerScoreDirector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

public class DeliveryRideSwapMoveIteratorFactory implements MoveIteratorFactory<DispatchSolution, Move<DispatchSolution>> {
    private static final Logger logger = LoggerFactory.getLogger(DeliveryRideSwapMoveIteratorFactory.class);

    private List<GenuineVariableDescriptor<DispatchSolution>> variableDescriptorList;
    private List<SingletonInverseVariableSupply> inverseVariableSupplyList = null;

    @Override
    public long getSize(ScoreDirector<DispatchSolution> scoreDirector) {
        throw new UnsupportedOperationException();
    }

    @Override
    public Iterator<Move<DispatchSolution>> createOriginalMoveIterator(ScoreDirector<DispatchSolution> scoreDirector) {
        throw new UnsupportedOperationException();
    }

    @Override
    public Iterator<Move<DispatchSolution>> createRandomMoveIterator(ScoreDirector<DispatchSolution> scoreDirector, Random workingRandom) {
        // original comment from @ge0ffrey
        // TODO DIRTY HACK due to lack of lifecycle methods
        if (inverseVariableSupplyList == null) {
            // original comment from @ge0ffrey
            // TODO DO NOT USE InnerScoreDirector!
            // No seriously, write a custom move instead of reusing ChainedSwapMove so you don't need any of this
            // Yes, I know, chain correction like in ChainedSwapMove is a big pain to write yourself...
            InnerScoreDirector<DispatchSolution, HardMediumSoftLongScore> innerScoreDirector = (InnerScoreDirector<DispatchSolution, HardMediumSoftLongScore>) scoreDirector;
            GenuineVariableDescriptor<DispatchSolution> variableDescriptor = innerScoreDirector.getSolutionDescriptor().findEntityDescriptorOrFail(PlanningVisit.class).getGenuineVariableDescriptor(Constants.PreviousVisitOrVehicle);
            variableDescriptorList = Collections.singletonList(variableDescriptor);
            inverseVariableSupplyList = Collections.singletonList(innerScoreDirector.getSupplyManager().demand(new SingletonInverseVariableDemand<>(variableDescriptor)));
        }

        logger.trace("Creating DeliveryRideSwapMoveIterator");
        DispatchSolution solution = scoreDirector.getWorkingSolution();
        DeliveryRideSwapMoveIterator deliveryRideSwapMoveIterator = new DeliveryRideSwapMoveIterator(solution.getRides(), workingRandom);
        logger.debug("DeliveryRideSwapMoveIterator created");

        return deliveryRideSwapMoveIterator;
    }

    @AllArgsConstructor
    private class DeliveryRideSwapMoveIterator implements Iterator<Move<DispatchSolution>> {

        private final List<DeliveryRide> rides;
        private final Random workingRandom;

        @Override
        public boolean hasNext() {
            return rides.size() >= 2;
        }

        @Override
        public Move<DispatchSolution> next() {
            int leftIdx = workingRandom.nextInt(rides.size());
            DeliveryRide leftDeliveryRide = rides.get(leftIdx);

            int rightIdx = workingRandom.nextInt(rides.size() - 1);
            if (rightIdx >= leftIdx) {
                rightIdx++;
            }
            DeliveryRide rightDeliveryRide = rides.get(rightIdx);

            return new CompositeMove<>(
                    new ChainedSwapMove<>(
                            variableDescriptorList, inverseVariableSupplyList,
                            leftDeliveryRide.getPickupVisit(), rightDeliveryRide.getPickupVisit()),
                    new ChainedSwapMove<>(
                            variableDescriptorList, inverseVariableSupplyList,
                            leftDeliveryRide.getDropoffVisit(), rightDeliveryRide.getDropoffVisit())
            );
        }
    }
}
