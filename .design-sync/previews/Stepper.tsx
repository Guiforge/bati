import { Stepper, YStack } from "bati-ds";

export const Reps = () => (
  <YStack bg="$surface" p="$4" width={360}>
    <Stepper label="Squat" hint="Did you do more or less?" value={14} min={0} max={99} onChange={() => {}} />
  </YStack>
);

export const Duration = () => (
  <YStack bg="$surface" p="$4" width={360}>
    <Stepper label="Rest" value={45} min={15} max={180} step={15} suffix="s" onChange={() => {}} />
  </YStack>
);
