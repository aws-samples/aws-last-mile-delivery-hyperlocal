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
import dev.aws.proto.apps.appcore.data.DdbServiceBase;
import dev.aws.proto.apps.sameday.directpudo.config.DdbProperties;
import dev.aws.proto.apps.sameday.directpudo.domain.planning.PlanningHub;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.util.aws.SsmUtility;
import org.bk.aws.dynamo.util.JsonAttributeValueUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class DdbHubService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbHubService.class);

    @Inject
    DdbProperties ddbProperties;

    private final String tableName;

    DdbHubService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;
        this.tableName = SsmUtility.getParameterValue(ddbProperties.hubsTableParameterName());
        super.dbClient = super.createDBClient();
    }

    @Override
    protected String getTableName() {
        return this.tableName;
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object hub_) {
//        PlanningHub hub = (PlanningHub) hub_;
//        ObjectMapper objectMapper = new ObjectMapper();
//
//        Map<String, AttributeValue> item = new HashMap<>();
//        item.put("ID", AttributeValue.builder().s(hub.getId()).build());
//        item.put("name", AttributeValue.builder().s(hub.getName()).build());
//        item.put("coordinate", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(hub.getCoordinate())));
//
//        return item;
        throw new UnsupportedOperationException();
    }

    public List<PlanningHub> listHubs() {
        logger.debug("Loading hubs");

        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(this.tableName)
                .build();

        List<Map<String, AttributeValue>> dbItems = super.dbClient.scan(scanRequest).items();
        if (dbItems.size() == 0) {
            return null;
        }

        List<PlanningHub> hubs = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();
        for (Map<String, AttributeValue> dbItem : dbItems) {
            try {
                Coordinate coord = objectMapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("coordinate")), Coordinate.class);
                hubs.add(new PlanningHub(dbItem.get("ID").s(), dbItem.get("name").s(), coord));
            } catch (JsonProcessingException e) {
                logger.error("Error parsing ddbItem :: coordinate", e);
            }
        }

        logger.info("Loaded {} hubs", hubs.size());

        return hubs;
    }
}
