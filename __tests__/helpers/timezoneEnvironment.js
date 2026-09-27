// Runs a suite in another timezone. `process.env.TZ` set from a test never reaches `Date`: jest hands
// the sandbox a copy of the environment. An environment runs in the worker itself, where setting it
// does, so this sets it for the suite and puts the worker's own back after.
// biome-ignore lint/correctness/noUndeclaredDependencies: ships inside jest, which is what loads this file; declaring it would pin a second copy of what jest already resolves.
const { TestEnvironment } = require("jest-environment-node");

module.exports = class TimezoneEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.tz = config.projectConfig.testEnvironmentOptions.timezone;
  }

  async setup() {
    this.previous = process.env.TZ;
    process.env.TZ = this.tz;
    await super.setup();
  }

  async teardown() {
    if (this.previous === undefined) delete process.env.TZ;
    else process.env.TZ = this.previous;
    await super.teardown();
  }
};
