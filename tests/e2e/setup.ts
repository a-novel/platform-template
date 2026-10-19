import { compose } from "./fixtures";

import { composeSetup } from "@a-novel-kit/nodelib-test/playwright";

/** Owns fresh services for the browser run, including diagnostics and teardown. */
export default composeSetup({
  compose,
  ready: async () => (await fetch("http://127.0.0.1:14100/v2/ping")).ok,
});
