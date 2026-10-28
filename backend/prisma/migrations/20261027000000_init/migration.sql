CREATE TYPE "Role" AS ENUM ('MAGANG', 'MENTOR');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'SIGNED');
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMITTED', 'RETURNED', 'SIGNED', 'SIGNATURE_CHANGED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternshipPlacement" (
  "id" TEXT NOT NULL, "internId" TEXT NOT NULL, "mentorId" TEXT NOT NULL,
  "officeName" TEXT NOT NULL, "region" TEXT NOT NULL, "division" TEXT NOT NULL, "position" TEXT NOT NULL,
  "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternshipPlacement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternshipPlacement_period_check" CHECK ("endDate" >= "startDate")
);

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL, "placementId" TEXT NOT NULL, "activityDate" DATE NOT NULL,
  "startTime" VARCHAR(5) NOT NULL, "endTime" VARCHAR(5) NOT NULL, "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Activity_weekday_check" CHECK (EXTRACT(ISODOW FROM "activityDate") BETWEEN 1 AND 5),
  CONSTRAINT "Activity_time_check" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" > "startTime"),
  CONSTRAINT "Activity_description_check" CHECK (char_length(btrim("description")) BETWEEN 5 AND 5000)
);

CREATE TABLE "WeeklyReport" (
  "id" TEXT NOT NULL, "placementId" TEXT NOT NULL, "weekStart" DATE NOT NULL,
  "weekIndex" INTEGER NOT NULL, "monthIndex" INTEGER NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT', "submittedAt" TIMESTAMP(3), "signedAt" TIMESTAMP(3),
  "signedById" TEXT, "signatureVersionId" TEXT, "returnReason" TEXT, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyReport_week_start_check" CHECK (EXTRACT(ISODOW FROM "weekStart") = 1),
  CONSTRAINT "WeeklyReport_signed_fields_check" CHECK (
    ("status" = 'SIGNED' AND "signedAt" IS NOT NULL AND "signedById" IS NOT NULL AND "signatureVersionId" IS NOT NULL)
    OR ("status" <> 'SIGNED' AND "signedAt" IS NULL AND "signedById" IS NULL AND "signatureVersionId" IS NULL)
  )
);

CREATE TABLE "MentorSignature" (
  "id" TEXT NOT NULL, "mentorId" TEXT NOT NULL, "filePath" TEXT NOT NULL, "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MentorSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalAudit" (
  "id" TEXT NOT NULL, "reportId" TEXT, "actorId" TEXT NOT NULL, "action" "ApprovalAction" NOT NULL,
  "beforeStatus" "ReportStatus", "afterStatus" "ReportStatus", "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "InternshipPlacement_internId_idx" ON "InternshipPlacement"("internId");
CREATE INDEX "InternshipPlacement_mentorId_idx" ON "InternshipPlacement"("mentorId");
CREATE INDEX "Activity_placementId_activityDate_idx" ON "Activity"("placementId", "activityDate");
CREATE UNIQUE INDEX "Activity_placementId_activityDate_key" ON "Activity"("placementId", "activityDate");
CREATE INDEX "WeeklyReport_placementId_weekStart_idx" ON "WeeklyReport"("placementId", "weekStart");
CREATE INDEX "WeeklyReport_status_weekStart_idx" ON "WeeklyReport"("status", "weekStart");
CREATE UNIQUE INDEX "WeeklyReport_placementId_weekStart_key" ON "WeeklyReport"("placementId", "weekStart");
CREATE INDEX "MentorSignature_mentorId_isCurrent_idx" ON "MentorSignature"("mentorId", "isCurrent");
CREATE UNIQUE INDEX "MentorSignature_one_current_per_mentor" ON "MentorSignature"("mentorId") WHERE "isCurrent" = true;
CREATE INDEX "ApprovalAudit_reportId_createdAt_idx" ON "ApprovalAudit"("reportId", "createdAt");
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_userId_expiresAt_idx" ON "RefreshSession"("userId", "expiresAt");

ALTER TABLE "InternshipPlacement" ADD CONSTRAINT "InternshipPlacement_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternshipPlacement" ADD CONSTRAINT "InternshipPlacement_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "InternshipPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "InternshipPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_signatureVersionId_fkey" FOREIGN KEY ("signatureVersionId") REFERENCES "MentorSignature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSignature" ADD CONSTRAINT "MentorSignature_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalAudit" ADD CONSTRAINT "ApprovalAudit_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalAudit" ADD CONSTRAINT "ApprovalAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
