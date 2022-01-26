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
package com.aws.proto.dispatching.data.ddb;

import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public abstract class DdbServiceBase {
    protected abstract String getTableName();
    protected String[] scanAttributes() { return null; }
    protected Map<String, AttributeValue> getPutItemMap(Object item) {
        return null;
    }

    protected ScanRequest scanRequest() {
        return ScanRequest.builder()
          .tableName(this.getTableName())
          .build();
    }

    protected ScanRequest scanRequestWithAttributes() {
        return ScanRequest.builder()
          .tableName(this.getTableName())
          .attributesToGet(this.scanAttributes())
          .build();
    }

    protected GetItemRequest getItemRequest(String idAttributeName, Object id) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put(idAttributeName, AttributeValue.builder().s(id.toString()).build());

        return GetItemRequest.builder()
          .tableName(this.getTableName())
          .key(key)
          .build();
    }

    protected QueryRequest getQueryRequest(String idAttributeName, Object id) {
        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#"+ idAttributeName, idAttributeName);

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":"+idAttributeName+"Value", AttributeValue.builder().s(id.toString()).build());

        return QueryRequest.builder()
          .tableName(this.getTableName())
          .keyConditionExpression(String.format("#%s = :%sValue", idAttributeName, idAttributeName))
          .expressionAttributeNames(expressionAttributeNames)
          .expressionAttributeValues(expressionAttributeValues)
          .build();
    }

     protected PutItemRequest putRequest(Object item) {
        Map<String, AttributeValue> itemMap = this.getPutItemMap(item);

        return PutItemRequest.builder()
          .tableName(getTableName())
          .item(itemMap)
          .build();
    }
}
