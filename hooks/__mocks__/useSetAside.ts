// For screen tests that are not about the writes: the real hook needs a ToastProvider and opens
// the database through `db/setAside`. `jest.mock("@/hooks/useSetAside")`.
export const useSetAside = () => ({
  setAside: () => Promise.resolve(true),
  putBack: () => Promise.resolve(true),
});
