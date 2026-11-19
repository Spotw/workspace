import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

test("tasks API reads the requested week from schedule_duyvu", async () => {
  const tasks = [{ id: "task-1", title: "Review schedule", done: false }];
  const database = {
    prepare(query) {
      assert.equal(query, 'SELECT date, tasks FROM "schedule_duyvu" WHERE date >= ? AND date <= ?');
      return {
        bind(...values) {
          assert.deepEqual(values, ["2026-11-16", "2026-11-22"]);
          return {
            async all() {
              return { results: [{ date: "2026-11-19", tasks: JSON.stringify(tasks) }] };
            },
          };
        },
      };
    },
  };

  const response = await worker.fetch(
    new Request("https://workspace.test/api/tasks?week=2026-11-16"),
    { DB: database },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    tasks: {
      "2026-11-16": [],
      "2026-11-17": [],
      "2026-11-18": [],
      "2026-11-19": tasks,
      "2026-11-20": [],
      "2026-11-21": [],
      "2026-11-22": [],
    },
  });
});
