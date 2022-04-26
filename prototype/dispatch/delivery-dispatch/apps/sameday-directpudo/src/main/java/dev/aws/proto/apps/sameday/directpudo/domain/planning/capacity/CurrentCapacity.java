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

package dev.aws.proto.apps.sameday.directpudo.domain.planning.capacity;

import dev.aws.proto.apps.sameday.directpudo.data.Parcel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CurrentCapacity extends CapacityBase {
    public static final CurrentCapacity ZERO = CurrentCapacity.builder().build();

    private MaxCapacity maxCapacity;

    public boolean canAddParcel(Parcel parcel) {
        float newLength = Math.max(this.getLength(), parcel.getLength());
        float newHeight = this.getHeight() + parcel.getHeight();
        float newWidth = Math.max(this.getWidth(), parcel.getWidth());
        float newWeight = this.getWeight() + parcel.getWeight();

        return !this.maxCapacity.exceeds(newLength, newHeight, newWidth, newWeight);
    }

    public void addParcel(Parcel parcel) {
//        if (!this.canAddParcel(parcel)) {
//            throw new CapacityException(String.format("Cannot add parcel %s, it exceeds max capacity %s", parcel, maxCapacity));
//        }

        this.setLength(Math.max(this.getLength(), parcel.getLength()));
        this.setHeight(this.getHeight() + parcel.getHeight());
        this.setWidth(Math.max(this.getWidth(), parcel.getWidth()));
        this.setWeight(this.getWeight() + parcel.getWeight());
    }

    public float excessAmountForWeight() {
        return (float) Math.max(this.getWeight() - this.maxCapacity.getWeight(), 0.0);
    }

    public float excessAmountForHeight() {
        return (float) Math.max(this.getHeight() - this.maxCapacity.getHeight(), 0.0);
    }

    public boolean tryAddParcel(Parcel parcel) {
        if (!this.canAddParcel(parcel)) {
            return false;
        }

        this.setLength(Math.max(this.getLength(), parcel.getLength()));
        this.setHeight(this.getHeight() + parcel.getHeight());
        this.setWidth(Math.max(this.getWidth(), parcel.getWidth()));
        this.setWeight(this.getWeight() + parcel.getWeight());

        return true;
    }

    public void removeParcel(Parcel parcel) {
        // don't change length/width as we don't have enough information about
        // previous maxLengths/maxWidths, unless we maintain it in a linked list
        // but it's not necessary ATM
        this.setHeight(Math.max(this.getHeight() - parcel.getHeight(), 0));
        this.setWeight(Math.max(this.getWeight() - parcel.getWeight(), 0));
    }

    @Override
    public String toString() {
        return "[current capacity: " + super.toString() + "]";
    }
}