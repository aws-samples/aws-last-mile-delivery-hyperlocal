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
package com.aws.proto.dispatching.api.instant.sequential;

import com.aws.proto.dispatching.data.DriverQueryManager;
import com.aws.proto.dispatching.data.ddb.DdbDemographicAreaSettingsService;
import com.aws.proto.dispatching.data.entity.DemographicAreaSetting;
import com.aws.proto.dispatching.data.entity.InputDriverData;
import com.aws.proto.dispatching.routing.Coordinates;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
@Path("/instant/sequential/test")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TestResource {

    @Inject
    DriverQueryManager driverQueryManager;

    @Inject
    DdbDemographicAreaSettingsService demAreaService;

    @GET
    @Path("drivers")
    public List<InputDriverData> testDriverClient() {
//        List<InputDriverData> result = driverQueryManager.getDrivers("m", "IDLE", -6.185903, 106.841798, 100,200000);
        List<Coordinates> coords = new ArrayList<>();
        coords.add(Coordinates.valueOf(-6.185903, 106.841798));
        coords.add(Coordinates.valueOf(-6.184284528773918, 106.70852578950233));
        coords.add(Coordinates.valueOf(-6.191455503477229, 106.70333869887081));
        coords.add(Coordinates.valueOf(-6.182431309026212, 106.71128371996554));
        coords.add(Coordinates.valueOf(-6.190727961960388, 106.71310917766932));
        coords.add(Coordinates.valueOf(-6.1891749734245325, 106.70248542328174));
        List<InputDriverData> result = driverQueryManager.getDriversAroundLocations(coords, 3);
        return result;
    }

    @GET
    @Path("demarea-settings")
    public List<DemographicAreaSetting> testDemographicAreaSettingsClient() {
        Map<String, DemographicAreaSetting> dict = demAreaService.findAll();
        return new ArrayList<>(dict.values());
    }
}
