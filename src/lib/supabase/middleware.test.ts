import test from "node:test";
import assert from "node:assert/strict";

import { getRedirectTarget } from "./auth-routing";

test("redirects unauthenticated user from protected route to sign-in", () => {
  const redirect = getRedirectTarget("/upload", false);
  assert.equal(redirect, "/sign-in?next=%2Fupload");
});

test("allows authenticated user on protected route", () => {
  const redirect = getRedirectTarget("/dashboard", true);
  assert.equal(redirect, null);
});

test("redirects authenticated user away from sign-in", () => {
  const redirect = getRedirectTarget("/sign-in", true);
  assert.equal(redirect, "/dashboard");
});
