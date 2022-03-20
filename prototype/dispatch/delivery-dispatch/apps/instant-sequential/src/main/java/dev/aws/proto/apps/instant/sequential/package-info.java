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

/**
 * This module is the implementation of the "instant-sequential" delivery domain.
 * <p>
 * What is "instant-sequential"?
 * <p>
 * Instant delivery - When the orders come into the system, they are provided to the dispatch engine that tries to find
 * immediately a suitable driver to assign the order to.
 * <p>
 * Sequential - The way orders are assigned are "sequential". Once an order is assigned to a driver, we assume that the
 * driver will drive to the pickup location (e.g.: restaurant, seller, etc), takes the delivery item and drives to the
 * drop-off location (e.g.: customer who ordered food/etc). If there are multiple orders assigned to the driver, it will
 * always follow the Order[i]Pickup->Order[i]Dropoff->Order[i+1]Pickup->Order[i+1]Dropoff (sequential) pattern.
 */
package dev.aws.proto.apps.instant.sequential;