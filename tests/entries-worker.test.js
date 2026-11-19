import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

test("removed entries API returns 404 without accessing the database", async () => {
  for (const [method, path] of [["GET", "/api/entries"], ["DELETE", "/api/entries/1"]]) {
    const response = await worker.fetch(new Request(`https://workspace.test${path}`, {
      method,
      headers: { Origin: "https://workspace.test" },
    }), {});
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found" });
  }
});
