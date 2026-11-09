#!/usr/bin/env node
/* ==========================================================================
   Bridge: call F.3.3 (js/hm-records.js) from outside Node.

   tests/test_functional_requirements.py is Python, the product is browser
   JavaScript, and there is only one implementation of F.3.3. This process
   loads the real browser modules through tests/harness.js and exposes them
   over stdin/stdout, so the Python requirement tests exercise the shipped
   code rather than a second copy of it.

     echo '{"fn":"screenForHighRiskAlerts","args":[{"urgent":["selfHarm"]}]}' \
       | node tests/hm-records-bridge.js

   In   { fn, args, seed }   fn    a key of HM.records
                             args  its arguments, in order
                             seed  optional partial state written to storage
                                   before the call (e.g. { checkins: {...} })
   Out  { ok, result, state } on success, { ok: false, error } on failure.
        `state` is the store after the call, so a test can assert what was
        actually persisted.

   One process per call: makeEnv() builds fresh globals and reloads every
   module, so no call can see another's storage.
   ========================================================================== */
const { makeEnv } = require("./harness");

function read(stream) {
  return new Promise((resolve, reject) => {
    let text = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { text += chunk; });
    stream.on("end", () => resolve(text));
    stream.on("error", reject);
  });
}

(async () => {
  let out;
  try {
    const request = JSON.parse((await read(process.stdin)) || "{}");
    const HM = makeEnv();

    if (request.seed) {
      HM.store.update((s) => Object.assign(s, request.seed));
    }

    const fn = HM.records[request.fn];
    if (typeof fn !== "function") {
      throw new Error("no such function on HM.records: " + request.fn);
    }

    const result = fn.apply(null, request.args || []);
    out = { ok: true, result: result === undefined ? null : result, state: HM.store.load() };
  } catch (err) {
    out = { ok: false, error: err.message, stack: err.stack };
  }

  process.stdout.write(JSON.stringify(out));
  process.exit(out.ok ? 0 : 1);
})();
