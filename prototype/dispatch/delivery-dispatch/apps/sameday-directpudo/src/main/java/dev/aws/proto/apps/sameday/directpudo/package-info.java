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
 * This module is the implementation of the "sameday-directpudo" delivery domain.
 * <p>
 * Same day delivery - When orders come into the system, they are batched for a while and handled together, and from
 * time to time, there is a dispatching request where these orders will be grouped together into jobs that can be
 * assigned to drivers.
 * <p>
 * Direct pickup-dropoff - There is no warehouse concept involved in the model. All the orders define a pickup and a
 * dropoff location, that will be used while planning a route for a driver.
 * <p>
 * This domain is close to a time-windowed, rider capacitated vehicle routing problem, but without the concept of
 * keeping all the packages in a warehouse along with vehicles, but the vehicles are riders who are moving around and
 * are able to take jobs (sets of orders).
 */
package dev.aws.proto.apps.sameday.directpudo;