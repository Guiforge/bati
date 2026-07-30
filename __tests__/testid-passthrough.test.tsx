import { render } from "@testing-library/react-native";
import { Button, TamaguiProvider, Text } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import config from "@/tamagui.config";

// The Maestro flows address every element by testID (see .maestro/README.md).
// That only works because AppButton/Card spread their rest props onto the
// underlying Tamagui view. If someone stops spreading, the flows go blind and
// fail with an unhelpful "element not found" on a device — fail here instead.

test("testID reaches the tree through AppButton, Card and a bare Button", async () => {
  const { getByTestId } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AppButton testID="app-button">go</AppButton>
      <Card testID="card">
        <Text>body</Text>
      </Card>
      <Button testID="bare-button">go</Button>
    </TamaguiProvider>,
  );

  expect(getByTestId("app-button")).toBeTruthy();
  expect(getByTestId("card")).toBeTruthy();
  expect(getByTestId("bare-button")).toBeTruthy();
});
