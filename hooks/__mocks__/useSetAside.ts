// For screen tests that are not about the writes: the real hook needs a ToastProvider and opens
// the database through `db/setAside`. `jest.mock("@/hooks/useSetAside")`. It answers like the
// real one does when nothing else is set aside with it, so a caller's chain can still be read.
export const useSetAside = () => ({
  setAside: (exercise: { enName: string }) => Promise.resolve(new Set([exercise.enName])),
  putBack: () => Promise.resolve(true),
});
