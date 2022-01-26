/*-
 * ========================LICENSE_START=================================
 * Order Dispatcher
 * %%
 * Copyright (C) 2006 - 2022 Amazon Web Services
 * %%
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * =========================LICENSE_END==================================
 */
package com.aws.proto.dispatching.api.v2;

import com.aws.proto.dispatching.api.request.AssignDriversRequest;
import com.aws.proto.dispatching.api.response.DispatcherRequestResult;
import com.aws.proto.dispatching.api.response.DispatcherResult;
import io.smallrye.mutiny.Uni;
import org.jobrunr.scheduling.JobScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.*;

@ApplicationScoped
@Path("/v2/dispatch")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DispatcherResource {
    private static final Logger logger = LoggerFactory.getLogger(DispatcherResource.class);

    @Inject
    DispatcherService dispatcherService;

    @Inject
    JobScheduler jobScheduler;

    @POST
    @Path("assign-drivers")
    public DispatcherRequestResult assignDrivers(AssignDriversRequest req) {
        logger.info("Assign drivers request :: centroid :: {}/{} :: orders = {}", req.centroid.lat, req.centroid.lon, req.orders.length);

        UUID problemId = UUID.randomUUID();
        jobScheduler.<DispatcherService>enqueue(dispatcherService -> dispatcherService.assignDrivers(problemId, req));
        return new DispatcherRequestResult(problemId.toString());
    }

    @GET
    @Path("status/{problemId}")
    public DispatcherResult getSolutionStatus(@PathParam("problemId") String id) {
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
