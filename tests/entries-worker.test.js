import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

class MemoryD1 {
  constructor(rows) {
    this.rows = rows;
  }

  prepare(query) {
    return new MemoryStatement(this, query);
  }
}

class MemoryStatement {
  constructor(database, query) {
    this.database = database;
    this.query = query;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async all() {
    assert.match(this.query, /SELECT id, loai_thong_tin, mo_ta, noi_dung, created_at FROM entries WHERE deleted_at IS NULL/);
    return { results: [...this.database.rows].filter((entry) => entry.deleted_at == null).reverse() };
  }

  async run() {
    assert.equal(this.query, "UPDATE entries SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL");
    const entry = this.database.rows.find((row) => row.id === Number(this.values[0]) && row.deleted_at == null);
    if (entry) entry.deleted_at = "2026-11-02 16:00:00";
    return { meta: { changes: entry ? 1 : 0 } };
  }
}

test("entries API soft-deletes a record and excludes it from portal results", async () => {
  const database = new MemoryD1([
    { id: 1, mo_ta: "Thông tin cần xóa", deleted_at: null },
    { id: 2, mo_ta: "Thông tin còn lại", deleted_at: null },
  ]);
  const response = await worker.fetch(new Request("https://workspace.test/api/entries/1", {
    method: "DELETE",
    headers: { Origin: "https://workspace.test" },
  }), { DB: database });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(database.rows.length, 2);
  assert.notEqual(database.rows[0].deleted_at, null);

  const listResponse = await worker.fetch(new Request("https://workspace.test/api/entries"), { DB: database });
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).map((entry) => entry.id), [2]);
});

test("entries API rejects cross-origin deletes and reports missing records", async () => {
  const database = new MemoryD1([{ id: 1, mo_ta: "Thông tin còn lại", deleted_at: null }]);
  const crossOriginResponse = await worker.fetch(new Request("https://workspace.test/api/entries/1", {
    method: "DELETE",
    headers: { Origin: "https://attacker.test" },
  }), { DB: database });
  assert.equal(crossOriginResponse.status, 403);

  const missingResponse = await worker.fetch(new Request("https://workspace.test/api/entries/9", {
    method: "DELETE",
    headers: { Origin: "https://workspace.test" },
  }), { DB: database });
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), { error: "Không tìm thấy thông tin." });
  assert.deepEqual(database.rows.map((entry) => entry.id), [1]);
});
