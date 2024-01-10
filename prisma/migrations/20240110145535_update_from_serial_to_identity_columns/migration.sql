BEGIN;

ALTER TABLE "User" ALTER id DROP DEFAULT;
DROP SEQUENCE "User_id_seq";

ALTER TABLE "User" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"User"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "User"), 1),
    false
);

ALTER TABLE "Creator" ALTER id DROP DEFAULT;
DROP SEQUENCE "Creator_id_seq";

ALTER TABLE "Creator" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"Creator"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "Creator"), 1),
    false
);

ALTER TABLE "ComicIssue" ALTER id DROP DEFAULT;
DROP SEQUENCE "ComicIssue_id_seq";

ALTER TABLE "ComicIssue" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"ComicIssue"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "ComicIssue"), 1),
    false
);

ALTER TABLE "ComicCollaborator" ALTER id DROP DEFAULT;
DROP SEQUENCE "ComicCollaborator_id_seq";

ALTER TABLE "ComicCollaborator" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"ComicCollaborator"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "ComicCollaborator"), 1),
    false
);

ALTER TABLE "ComicIssueCollaborator" ALTER id DROP DEFAULT;
DROP SEQUENCE "ComicIssueCollaborator_id_seq";

ALTER TABLE "ComicIssueCollaborator" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"ComicIssueCollaborator"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "ComicIssueCollaborator"), 1),
    false
);

ALTER TABLE "StatelessCover" ALTER id DROP DEFAULT;
DROP SEQUENCE "StatelessCover_id_seq";

ALTER TABLE "StatelessCover" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"StatelessCover"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "StatelessCover"), 1),
    false
);

ALTER TABLE "StatefulCover" ALTER id DROP DEFAULT;
DROP SEQUENCE "StatefulCover_id_seq";

ALTER TABLE "StatefulCover" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"StatefulCover"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "StatefulCover"), 1),
    false
);

ALTER TABLE "CandyMachineGroup" ALTER id DROP DEFAULT;
DROP SEQUENCE "CandyMachineGroup_id_seq";

ALTER TABLE "CandyMachineGroup" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"CandyMachineGroup"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "CandyMachineGroup"), 1),
    false
);

ALTER TABLE "ComicPage" ALTER id DROP DEFAULT;
DROP SEQUENCE "ComicPage_id_seq";

ALTER TABLE "ComicPage" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"ComicPage"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "ComicPage"), 1),
    false
);

ALTER TABLE "ComicPage" ALTER "pageNumber" DROP DEFAULT;
DROP SEQUENCE "ComicPage_pageNumber_seq";

ALTER TABLE "ComicPage" ALTER COLUMN "pageNumber" ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"ComicPage"', 'pageNumber'),
    COALESCE((SELECT MAX("pageNumber") + 1 FROM "ComicPage"), 1),
    false
);

ALTER TABLE "CarouselSlide" ALTER id DROP DEFAULT;
DROP SEQUENCE "CarouselSlide_id_seq";

ALTER TABLE "CarouselSlide" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"CarouselSlide"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "CarouselSlide"), 1),
    false
);

ALTER TABLE "Listing" ALTER id DROP DEFAULT;
DROP SEQUENCE "Listing_id_seq";

ALTER TABLE "Listing" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"Listing"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "Listing"), 1),
    false
);

ALTER TABLE "SplToken" ALTER id DROP DEFAULT;
DROP SEQUENCE "SplToken_id_seq";

ALTER TABLE "SplToken" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"SplToken"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "SplToken"), 1),
    false
);

ALTER TABLE "GlobalStatus" ALTER id DROP DEFAULT;
DROP SEQUENCE "GlobalStatus_id_seq";

ALTER TABLE "GlobalStatus" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
SELECT pg_catalog.setval(
    pg_get_serial_sequence('"GlobalStatus"', 'id'),
    COALESCE((SELECT MAX(id) + 1 FROM "GlobalStatus"), 1),
    false
);

COMMIT;