import { render } from "@testing-library/react-native";
import { OmbreContact } from "@/components/village/iso/OmbreContact";

describe("iso contact shadow", () => {
  test("a dark core on a small faint halo, true 2:1, pushed right, no gradient and no path", async () => {
    const { toJSON } = await render(<OmbreContact x={0} y={0} largeur={40} />);
    const json = JSON.stringify(toJSON());
    expect(json.match(/RNSVGEllipse/g)).toHaveLength(2);
    expect(json).not.toContain("Gradient");
    expect(json).not.toContain("RNSVGPath");
    expect(json).toContain('"rx":16,"ry":8');
    expect(json).toContain('"rx":11,"ry":5.5');
    // The svg is 60 wide: both centres sit at 30 plus an 8 dp push to the right.
    expect(json.match(/"cx":38/g)).toHaveLength(2);
    expect(json.indexOf('"fillOpacity":0.1')).toBeLessThan(json.indexOf('"fillOpacity":0.26'));
  });
});
