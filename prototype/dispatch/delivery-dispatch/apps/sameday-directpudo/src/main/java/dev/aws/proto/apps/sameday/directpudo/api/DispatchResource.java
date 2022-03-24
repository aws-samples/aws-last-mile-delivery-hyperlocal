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

package dev.aws.proto.apps.sameday.directpudo.api;

import dev.aws.proto.apps.appcore.api.response.RequestResult;
import dev.aws.proto.apps.sameday.directpudo.api.request.DispatchRequest;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJobWithDeliveryJobs;
import org.jobrunr.scheduling.JobScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.UUID;

@ApplicationScoped
@Path("/sameday/directpudo/dispatch")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DispatchResource {
    private static final Logger logger = LoggerFactory.getLogger(DispatchResource.class);

    @Inject
    DispatchService dispatcherService;

    @Inject
    JobScheduler jobScheduler;

    @POST
    @Path("solve")
    public RequestResult solve(DispatchRequest req) {
        logger.info("Dispatch solve request :: orders = {}", req.getOrders().length);

        UUID problemId = UUID.randomUUID();
        jobScheduler.<DispatchService>enqueue(dispatcherService -> dispatcherService.solveDispatchProblem(problemId, req));
        dispatcherService.saveInitialEnqueued(problemId, req);
        return RequestResult.of(problemId.toString());
    }

    @GET
    @Path("status/{problemId}")
    public SolverJobWithDeliveryJobs getSolutionStatus(@PathParam("problemId") String id) {
        logger.debug(":: GetSolutionStatus :: problemId = {}", id);
        UUID problemId = UUID.fromString(id);

        return dispatcherService.getSolutionStatus(problemId);
    }
}
