import fs from "node:fs";
import path from "node:path";

/**
 * JS and Kotlin name the view by a string, and a typo between them only shows on a phone, as a screen
 * that fails to open at the moment a hero points their camera.
 */
const mockRequireNativeView = jest.fn((_name: string) => "view");
jest.mock("expo", () => ({ requireNativeView: (name: string) => mockRequireNativeView(name) }));

test("the view JS asks for is the one the Kotlin module declares", () => {
  const { ScannerView } =
    require("../modules/bati-scanner") as typeof import("../modules/bati-scanner");
  expect(ScannerView).toBe("view");

  const kotlin = fs.readFileSync(
    path.join(
      __dirname,
      "../modules/bati-scanner/android/src/main/java/expo/modules/batiscanner/BatiScannerModule.kt",
    ),
    "utf8",
  );
  const asked = mockRequireNativeView.mock.calls[0]?.[0];
  expect(asked).toBe("BatiScanner");
  expect(kotlin).toContain(`Name("${asked}")`);
});
