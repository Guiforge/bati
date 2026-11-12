import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { HealthExportLine } from "@/components/journal/HealthExportLine";
import "@/i18n";
import type { HealthPort } from "@/src/healthExport/port";
import config from "@/tamagui.config";

/** The line in a session's detail: words only, and nothing when there is nothing to say. */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockStatus = jest.fn((_port: HealthPort, _uuid: string) =>
  Promise.resolve<"sent" | "waiting" | null>(null),
);
jest.mock("@/src/healthExport/sync", () => ({
  healthExportStatus: (port: HealthPort, uuid: string) => mockStatus(port, uuid),
}));

const port = (available: boolean) => ({ available: () => available }) as HealthPort;

async function mount(uuid: string | null, available = true) {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <HealthExportLine sessionUuid={uuid} reload={1} port={port(available)} />
    </TamaguiProvider>,
  );
}

beforeEach(() => mockStatus.mockClear());

test.each([
  ["sent", "Sent to Health Connect"],
  ["waiting", "Waiting to be sent to Health Connect"],
] as const)("%s: one line of text", async (status, line) => {
  mockStatus.mockResolvedValueOnce(status);
  await mount("u");
  expect(await screen.findByText(line)).toBeTruthy();
});

test("nothing to say: nothing rendered", async () => {
  await mount("u");
  expect(mockStatus).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("journal-health-export")).toBeNull();
});

test("Health Connect absent, or no uuid: not even asked", async () => {
  await mount("u", false);
  await mount(null);
  expect(mockStatus).not.toHaveBeenCalled();
  expect(screen.queryByTestId("journal-health-export")).toBeNull();
});
