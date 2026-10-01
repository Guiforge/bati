// For screen tests that are not about setting exercises aside: the real hook needs a
// ToastProvider and opens the database through `db/setAside`. `jest.mock("@/hooks/useSetAside")`.
export const useSetAside = () => ({
  setAside: () => Promise.resolve(new Set<string>()),
  putBack: () => Promise.resolve(),
});
