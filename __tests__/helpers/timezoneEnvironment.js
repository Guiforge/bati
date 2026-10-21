// Runs a suite in another timezone. `process.env.TZ` set from a test never reaches `Date`: jest hands
// the sandbox a copy of the environment. An environment runs in the worker itself, where setting it
// does, so this sets it for the suite and puts the worker's own back after.
// jest-expo's environment, not jest-environment-node's: since jest 30.4 teardown reads every global,
// and that one skips Expo's lazy getters (`fetch`, ...), which otherwise require outside the test.
const { TestEnvironment } = require("jest-expo/src/preset/nativeEnvironment");

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
