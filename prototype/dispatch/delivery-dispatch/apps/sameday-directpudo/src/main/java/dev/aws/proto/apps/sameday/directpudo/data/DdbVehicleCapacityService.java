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

package dev.aws.proto.apps.sameday.directpudo.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.aws.proto.apps.appcore.api.response.UnitValue;
import dev.aws.proto.apps.appcore.data.DdbServiceBase;
import dev.aws.proto.apps.sameday.directpudo.config.DdbProperties;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity.MaxCapacity;
import dev.aws.proto.core.util.aws.SsmUtility;
import org.bk.aws.dynamo.util.JsonAttributeValueUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class DdbVehicleCapacityService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbVehicleCapacityService.class);

    public static class UnitValueStringFloat extends UnitValue<String, Float> {
    }

    @Inject
    DdbProperties ddbProperties;

    final String tableName;

    @Override
    protected String getTableName() {
        return this.tableName;
    }

    DdbVehicleCapacityService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;
        this.tableName = SsmUtility.getParameterValue(ddbProperties.vehicleCapacityTableParameterName());
        this.dbClient = super.createDBClient();

        logger.trace("DdbVehicleCapacityService instantiated :: tableName = {}", this.tableName);
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object item) {
        throw new UnsupportedOperationException("Only READ is allowed for this table");
    }

    /**
     * Loads max capacity settings from the database.
     * <p>
     * <b>IMPORTANT:</b>
     * <li>Internally we don't use units. It is the implementer's responsibility to do any conversion necessary</li>
     * <li>If the units differ in the dispatch-request payload from these, you must sync them</li>
     *
     * @return The lookup table for {@link MaxCapacity} items
     */
    public Map<String, MaxCapacity> getMaxCapacities() {
        logger.debug("Loading vehicle capacities");

        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(this.tableName).build();

        List<Map<String, AttributeValue>> dbItems = super.dbClient.scan(scanRequest).items();
        if (dbItems.size() == 0) {
            return null;
        }

        Map<String, MaxCapacity> maxCapacities = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper();

        for (Map<String, AttributeValue> dbItem : dbItems) {
            try {
                String id = dbItem.get("ID").s();
                UnitValue<String, Float> length = mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("length")), UnitValueStringFloat.class);
                UnitValue<String, Float> height = mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("height")), UnitValueStringFloat.class);
                UnitValue<String, Float> width = mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("width")), UnitValueStringFloat.class);
                UnitValue<String, Float> weight = mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("weight")), UnitValueStringFloat.class);
                MaxCapacity maxCap = MaxCapacity.builder()
                        .length(length.getValue())
                        .height(height.getValue())
                        .width(width.getValue())
                        .weight(weight.getValue())
                        .build();
                maxCapacities.put(id, maxCap);
            } catch (JsonProcessingException e) {
                logger.error("Error parsing vehicle capacity ddbItem", e);
            }
        }

        return maxCapacities;
    }

}
