import { describe, it } from "node:test";
import assert from "node:assert";
import { redactPrivateRepoUrl } from "./lib.js";

describe("redactPrivateRepoUrl", () => {
  it("should redact repository name with first and last character", () => {
    const url = "https://github.com/mdn/translated-content/issues/1234";
    const expected = "https://github.com/mdn/t*********-******t/issues/1234";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should redact long repository names", () => {
    const url =
      "https://github.com/mdn/very-long-private-repository-name/pull/56";
    const expected =
      "https://github.com/mdn/v***-****-*******-**********-***e/pull/56";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should redact short repository names (2 characters)", () => {
    const url = "https://github.com/mdn/ab/issues/123";
    const expected = "https://github.com/mdn/**/issues/123";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should redact single character repository names", () => {
    const url = "https://github.com/mdn/x/issues/1";
    const expected = "https://github.com/mdn/*/issues/1";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should handle three character repository names", () => {
    const url = "https://github.com/mdn/foo/issues/42";
    const expected = "https://github.com/mdn/f*o/issues/42";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should handle pull request URLs", () => {
    const url = "https://github.com/mdn/private-repo/pull/789";
    const expected = "https://github.com/mdn/p******-***o/pull/789";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should return original URL if pattern doesn't match", () => {
    const url = "https://example.com/something";
    assert.strictEqual(redactPrivateRepoUrl(url), url);
  });

  it("should handle URLs with different suffixes", () => {
    const url = "https://github.com/mdn/secret-project/discussions/5";
    const expected = "https://github.com/mdn/s*****-******t/discussions/5";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });

  it("should preserve dots in repository names", () => {
    const url = "https://github.com/mdn/repo.name/issues/1";
    const expected = "https://github.com/mdn/r***.***e/issues/1";
    assert.strictEqual(redactPrivateRepoUrl(url), expected);
  });
});
