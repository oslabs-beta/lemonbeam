function renderWithProviders() {
  // plain helper function declaration, outside any describe block
}

const setup = () => {
  // plain arrow-function helper, outside any describe block
};

describe("LoginForm", () => {
  beforeAll(() => {
    // one-time setup for this suite
  });

  beforeEach(() => {
    // per-test setup
  });

  afterEach(() => {
    // per-test cleanup
  });

  afterAll(() => {
    // one-time cleanup
  });

  it("shows an error when login fails", () => {
    expect(true).toBe(true);
  });

  it("clears the error once the user retypes", async () => {
    await Promise.resolve();
    expect(true).toBe(true);
  });

  test("accepts valid credentials", function () {
    expect(true).toBe(true);
  });

  it.skip("is not implemented yet", () => {
    expect(true).toBe(true);
  });

  describe("when the network is offline", () => {
    it("shows an offline message", () => {
      expect(true).toBe(true);
    });
  });
});