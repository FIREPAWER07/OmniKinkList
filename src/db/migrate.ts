import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
