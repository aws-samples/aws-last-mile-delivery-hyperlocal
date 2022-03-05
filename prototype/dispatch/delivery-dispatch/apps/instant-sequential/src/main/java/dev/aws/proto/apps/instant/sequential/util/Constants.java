package dev.aws.proto.apps.instant.sequential.util;

import java.time.format.DateTimeFormatter;

public class Constants {
    public static final DateTimeFormatter DATETIMEFORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    public static final Long CONSTRAINTS_SCALE = 10000L;

    public static final String PlanningDriverRange = "PlanningDriverRange";
    // instant/sequential
    public static final String PlanningDeliveryRange = "PlanningDeliveryRange";
    public static final String PreviousDeliveryOrDriver = "previousDeliveryOrDriver";

    private Constants() {
        throw new AssertionError("Utility class");
    }
}
