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
package com.aws.proto.dispatching.logging;

import org.jboss.logging.Logger;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.ServerErrorException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

@Path("/logging-json")
public class LoggingJsonResource {

    private static final Logger LOG = Logger.getLogger(LoggingJsonResource.class);
    private static final int SPEED_OF_SOUND_IN_METER_PER_SECOND = 343;

    private final AtomicInteger speed = new AtomicInteger(0);
    private final Random random = new Random();

    @GET
    @Path("faster")
    @Produces(MediaType.TEXT_PLAIN)
    public String faster() {
        final int s = speed.addAndGet(random.nextInt(200));
        if (s > SPEED_OF_SOUND_IN_METER_PER_SECOND) {
            throw new ServerErrorException("💥 SONIC BOOOOOM!!!", Response.Status.SERVICE_UNAVAILABLE);
        }
        String message = String.format("Your jet aircraft speed is %s m/s.", s);
        LOG.info(message);
        return message + " Watch the logs...";
    }
}
