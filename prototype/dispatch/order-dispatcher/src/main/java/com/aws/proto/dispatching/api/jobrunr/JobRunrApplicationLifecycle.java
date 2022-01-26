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
package com.aws.proto.dispatching.api.jobrunr;

import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import org.jobrunr.dashboard.JobRunrDashboardWebServer;
import org.jobrunr.server.BackgroundJobServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;
import javax.inject.Inject;

@ApplicationScoped
public class JobRunrApplicationLifecycle {
        private static final Logger logger = LoggerFactory.getLogger(JobRunrApplicationLifecycle.class);

        @Inject
        BackgroundJobServer backgroundJobServer;
        @Inject
        JobRunrDashboardWebServer dashboard;


        void onStart(@Observes StartupEvent ev) {
            logger.debug("JobRunr :: Starting background job server");
            backgroundJobServer.start();
            logger.debug("JobRunr :: Starting dashboard");
            dashboard.start();
            logger.info("JobRunr :: Starting up background job server and dashboard done");
        }

        void onStop(@Observes ShutdownEvent ev) {
            logger.debug("JobRunr :: Stopping background job server");
            backgroundJobServer.stop();
            logger.debug("JobRunr :: Stopping dashboard");
            dashboard.stop();
            logger.info("JobRunr :: Stopped background job server and dashboard");
        }
}
