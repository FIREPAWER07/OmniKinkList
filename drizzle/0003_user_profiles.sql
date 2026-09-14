ALTER TABLE "user" ADD COLUMN "username" text DEFAULT ('user_' || substr(md5(random()::text), 1, 10)) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "profile_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Accounts created before profiles existed were told their name was private, so their profiles start hidden.
UPDATE "user" SET "profile_public" = false;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
