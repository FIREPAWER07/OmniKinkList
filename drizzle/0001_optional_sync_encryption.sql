ALTER TABLE "user_vaults" ALTER COLUMN "ciphertext" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vaults" ALTER COLUMN "iv" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vaults" ALTER COLUMN "salt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vaults" ALTER COLUMN "iterations" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vaults" ADD COLUMN "data" text;--> statement-breakpoint
ALTER TABLE "user_vaults" ADD CONSTRAINT "user_vaults_one_payload" CHECK (("user_vaults"."data" is not null and "user_vaults"."ciphertext" is null) or ("user_vaults"."data" is null and "user_vaults"."ciphertext" is not null and "user_vaults"."iv" is not null and "user_vaults"."salt" is not null and "user_vaults"."iterations" is not null));