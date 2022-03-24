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

package dev.aws.proto.apps.instant.sequential.api;


import dev.aws.proto.apps.appcore.api.response.RequestResult;
import dev.aws.proto.apps.instant.sequential.api.request.DispatchRequest;
import dev.aws.proto.apps.instant.sequential.api.response.DispatchResult;
import org.jobrunr.scheduling.JobScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.UUID;

/**
 * Resource for dispatching endpoints.
 */
@ApplicationScoped
@Path("/instant/sequential/dispatch")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DispatchResource {
    private static final Logger logger = LoggerFactory.getLogger(DispatchResource.class);

    @Inject
    DispatchService dispatcherService;

    @Inject
    JobScheduler jobScheduler;

    /**
     * Triggers the dispatching service with a dispatch problem solving job.
     * It immediately returns with the problem ID that can be used to query the status of it.
     *
     * @param req The dispatch request object that has all the necessary information to create a solver job and execute it.
     * @return The problem ID generated for the solving job.
     */
    @POST
    @Path("assign-drivers")
    public RequestResult assignDrivers(DispatchRequest req) {
        logger.info("Assign drivers request :: centroid :: {}/{} :: orders = {}", req.getCentroid().getLatitude(), req.getCentroid().getLongitude(), req.getOrders().length);

        UUID problemId = UUID.randomUUID();
        jobScheduler.<DispatchService>enqueue(dispatcherService -> dispatcherService.solveDispatchProblem(problemId, req));
        dispatcherService.saveInitialEnqueued(problemId, req);
        return RequestResult.of(problemId.toString());
    }

    /**
     * Retrieve the status of a previously submitted dispatching job request.
     *
     * @param id The problem ID
     * @return The result representing the dispatching job.
     */
    @GET
    @Path("status/{problemId}")
    public DispatchResult getSolutionStatus(@PathParam("problemId") String id) {
        logger.debug(":: GetSolutionStatus :: problemId = {}", id);
        UUID problemId = UUID.fromString(id);

        return dispatcherService.getSolutionStatus(problemId);
    }

    /**
     * Endpoint to trigger stopping solver
     */
//    @POST
//    @Path("terminate/{problemId}")
//    public DispatcherResult stopSolving(@PathParam("problemId") String id) {
//        UUID problemId = UUID.fromString(id);
//
//        // get from in-mem map
//        SolutionState<DispatchingSolution, UUID> state = this.solutionMap.get(problemId);
//
//        // doesn't exist
//        if (state == null) {
//            return new DispatcherResult(problemId, Timestamp.valueOf(LocalDateTime.now()).getTime(), null, null, "NOT_EXISTS", null);
//        }
//
//        // terminate solution
//        this.solverManager.terminateEarly(problemId);
//        logger.info("Dispatch solver terminated after {}ms", System.currentTimeMillis() - state.startTimestamp);
//
//        SolutionConsumer.consumeSolution(state.problem);
//        DispatcherResult result = SolutionConsumer.buildResult(state.problem, state.solverJob.getSolverStatus(), true);
//        result.state = "TERMINATED";
//        assignmentService.saveAssignment(result);
//        this.solutionMap.remove(problemId);
//
//        return result;
//    }


}

