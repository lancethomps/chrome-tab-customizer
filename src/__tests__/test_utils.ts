import { strTrim } from "../utils";

test("strTrim", () => {
  expect(strTrim(" abc ")).toBe("abc");
});
