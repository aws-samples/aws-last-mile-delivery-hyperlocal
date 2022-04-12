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
import dev.aws.proto.apps.sameday.directpudo.domain.planning.VisitOrDriver;
import dev.aws.proto.apps.sameday.directpudo.planner.solution.DispatchSolution;
import dev.aws.proto.apps.sameday.directpudo.util.Constants;
import org.optaplanner.core.api.score.buildin.hardmediumsoftlong.HardMediumSoftLongScore;
import org.optaplanner.core.api.score.director.ScoreDirector;
import org.optaplanner.core.impl.domain.variable.descriptor.GenuineVariableDescriptor;
import org.optaplanner.core.impl.domain.variable.inverserelation.SingletonInverseVariableDemand;
import org.optaplanner.core.impl.domain.variable.inverserelation.SingletonInverseVariableSupply;
import org.optaplanner.core.impl.heuristic.move.CompositeMove;
import org.optaplanner.core.impl.heuristic.move.Move;
import org.optaplanner.core.impl.heuristic.selector.move.factory.MoveIteratorFactory;
import org.optaplanner.core.impl.heuristic.selector.move.generic.chained.ChainedChangeMove;
import org.optaplanner.core.impl.score.director.InnerScoreDirector;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

public class DeliveryRideChangeMoveIteratorFactory implements MoveIteratorFactory<DispatchSolution, Move<DispatchSolution>> {
    GenuineVariableDescriptor<DispatchSolution> variableDescriptor = null;
    SingletonInverseVariableSupply inverseVariableSupply = null;

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
        // original comments from @ge0ffrey
        // TODO DIRTY HACK due to lack of lifecycle methods
        if (inverseVariableSupply == null) {
            // original comments from @ge0ffrey
            // TODO DO NOT USE InnerScoreDirector!
            // No seriously, write a custom move instead of reusing ChainedChangeMove so you don't need any of this
            // Yes, I know, chain correction like in ChainedChangeMove is a big pain to write yourself...
            InnerScoreDirector<DispatchSolution, HardMediumSoftLongScore> innerScoreDirector = (InnerScoreDirector<DispatchSolution, HardMediumSoftLongScore>) scoreDirector;
            variableDescriptor = innerScoreDirector.getSolutionDescriptor().findEntityDescriptorOrFail(PlanningVisit.class).getGenuineVariableDescriptor(Constants.PreviousVisitOrDriver);

            // original comments from @ge0ffrey
            // TODO DO NOT demand supplies without returning them
            inverseVariableSupply = innerScoreDirector.getSupplyManager().demand((new SingletonInverseVariableDemand<>(variableDescriptor)));
        }

        DispatchSolution solution = scoreDirector.getWorkingSolution();
        // original comments from @geoffrey
        // TODO perf loss because it happens at the start of every step but it doesn't different during the phase?
        List<VisitOrDriver> visitOrDrivers = new ArrayList<>(solution.getPlanningDrivers().size() + solution.getPlanningVisits().size());
        visitOrDrivers.addAll(solution.getPlanningDrivers());
        visitOrDrivers.addAll(solution.getPlanningVisits());

        return new DeliveryRideChangeMoveIterator(solution.getRides(), visitOrDrivers, workingRandom);
    }

    private class DeliveryRideChangeMoveIterator implements Iterator<Move<DispatchSolution>> {
        private final List<DeliveryRide> deliveryRides;
        private final List<VisitOrDriver> visitOrDrivers;
        private final Random workingRandom;

        public DeliveryRideChangeMoveIterator(List<DeliveryRide> deliveryRides, List<VisitOrDriver> visitOrDrivers, Random workingRandom) {
            this.deliveryRides = deliveryRides;
            this.visitOrDrivers = visitOrDrivers;
            this.workingRandom = workingRandom;
        }

        @Override
        public boolean hasNext() {
            return !deliveryRides.isEmpty() && visitOrDrivers.size() >= 4;
        }

        @Override
        public Move<DispatchSolution> next() {
            DeliveryRide deliveryRide = deliveryRides.get(workingRandom.nextInt(deliveryRides.size()));
            PlanningVisit fromPickupVisit = deliveryRide.getPickupVisit();
            PlanningVisit fromDropoffVisit = deliveryRide.getDropoffVisit();

            VisitOrDriver toPickupVisit = visitOrDrivers.get(workingRandom.nextInt(visitOrDrivers.size()));
            List<VisitOrDriver> potentialToDropoffVisitList = new ArrayList<>();
            potentialToDropoffVisitList.add(fromPickupVisit);

            PlanningVisit visit = toPickupVisit.getNextPlanningVisit();
            while (visit != null) {
                if (visit != fromPickupVisit && visit != fromDropoffVisit) {
                    potentialToDropoffVisitList.add(visit);
                }
                visit = visit.getNextVisit();
            }

            VisitOrDriver toDropoffVisit = potentialToDropoffVisitList.get(workingRandom.nextInt(potentialToDropoffVisitList.size()));

            ChainedChangeMove<DispatchSolution> pickupMove = new ChainedChangeMove<>(
                    fromPickupVisit, variableDescriptor, inverseVariableSupply, toPickupVisit);
            ChainedChangeMove<DispatchSolution> dropoffMove = new ChainedChangeMove<>(
                    fromDropoffVisit, variableDescriptor, inverseVariableSupply, toDropoffVisit);

            return new CompositeMove<>(pickupMove, dropoffMove);
        }
    }
}
