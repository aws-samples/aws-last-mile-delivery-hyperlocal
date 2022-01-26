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
package com.aws.proto.dispatching.domain.planningentity.base;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

public class Order {
    private String orderId;
    private Long timestamp;
    private LocalDateTime dateTime;
    private String state;
    private int restaurantPreparationTimeInMins;

    public Order(String orderId, Long timestamp, String state, int restaurantPreparationTimeInMins) {
        this.orderId = orderId;
        this.timestamp = timestamp;
        this.dateTime = Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault()).toLocalDateTime();
        this.state = state;
        this.restaurantPreparationTimeInMins = restaurantPreparationTimeInMins;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public int getRestaurantPreparationTimeInMins() {
        return restaurantPreparationTimeInMins;
    }

    @Override
    public String toString() {
        return "Order{" +
          "orderId='" + orderId + '\'' +
          ", dateTime=" + dateTime +
          ", restaurantPreparationTimeInMins=" + restaurantPreparationTimeInMins +
          '}';
    }

    public void setRestaurantPreparationTimeInMins(int restaurantPreparationTimeInMins) {
        this.restaurantPreparationTimeInMins = restaurantPreparationTimeInMins;
    }

    public LocalDateTime getDateTime() {
        return this.dateTime;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Order order = (Order) o;
        return orderId.equals(order.orderId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId);
    }

    public String getShortId() {
        return this.orderId.substring(0, 8);
    }
}
