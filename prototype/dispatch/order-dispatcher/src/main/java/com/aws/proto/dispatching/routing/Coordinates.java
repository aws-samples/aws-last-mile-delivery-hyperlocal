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
package com.aws.proto.dispatching.routing;


import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * Horizontal geographical coordinates consisting of latitude and longitude.
 */
public class Coordinates {

    private final BigDecimal latitude;
    private final BigDecimal longitude;

    public Coordinates(BigDecimal latitude, BigDecimal longitude) {
        this.latitude = Objects.requireNonNull(latitude);
        this.longitude = Objects.requireNonNull(longitude);
    }

    /**
     * Create coordinates from the given latitude in longitude.
     *
     * @param latitude  latitude
     * @param longitude longitude
     * @return coordinates with the given latitude and longitude
     */
    public static Coordinates valueOf(double latitude, double longitude) {
        return new Coordinates(BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude));
    }

    public static Coordinates buildFrom(ObjectInputStream inputStream) throws IOException {
        return Coordinates.valueOf(inputStream.readDouble(), inputStream.readDouble());
    }

    public void writeTo(ObjectOutputStream outputStream) throws IOException {
        outputStream.writeDouble(this.latitude.doubleValue());
        outputStream.writeDouble(this.longitude.doubleValue());
    }

    /**
     * Latitude.
     *
     * @return latitude (never {@code null})
     */
    public BigDecimal latitude() {
        return latitude;
    }

    /**
     * Longitude.
     *
     * @return longitude (never {@code null})
     */
    public BigDecimal longitude() {
        return longitude;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Coordinates coordinates = (Coordinates) o;
        return latitude.compareTo(coordinates.latitude) == 0 &&
          longitude.compareTo(coordinates.longitude) == 0;
    }

    @Override
    public int hashCode() {
        return Objects.hash(latitude.doubleValue(), longitude.doubleValue());
    }

    @Override
    public String toString() {
        return "[" + latitude.toPlainString() +
          ", " + longitude.toPlainString() +
          ']';
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
