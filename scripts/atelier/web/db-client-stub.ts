// The map alone needs no database: importing the real client opens SQLite at module load.
import * as schema from "@/db/schema";

export { schema };
export const expoDb = null;
export const db = null;
export const getRawDb = () => null;
