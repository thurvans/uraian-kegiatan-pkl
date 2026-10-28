ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_time_check";

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_time_check" CHECK (
  ("startTime" = 'WFH' AND "endTime" = 'WFH')
  OR
  (
    "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "endTime" > "startTime"
  )
);
