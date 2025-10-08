-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- AlterTable
ALTER TABLE "Reservation" ADD CONSTRAINT "no_overlap_reservations" 
EXCLUDE USING GIST (
  "roomType" WITH =,
  tsrange("checkIn", "checkOut") WITH &&
);
