-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "localPath" TEXT;

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "changedFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "error" TEXT,
ADD COLUMN     "rawFindingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "context" TEXT,
ADD COLUMN     "memberFingerprints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sources" "FindingSource"[] DEFAULT ARRAY[]::"FindingSource"[];

-- CreateIndex
CREATE INDEX "Assessment_status_createdAt_idx" ON "Assessment"("status", "createdAt");
