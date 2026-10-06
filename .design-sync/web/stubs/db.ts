// Web stand-in for @/db (SQLite does not exist in a claude.ai/design preview). Every call resolves
// to nothing, so stores keep their defaults; the components under sync never read the database.
const nothing = new Proxy({}, { get: () => async () => undefined });
export const preferences = nothing;
export const db = nothing;
export default nothing;
