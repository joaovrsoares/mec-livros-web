import assert from "node:assert";
import { test } from "node:test";
import { decryptResource } from "./decrypt-epub";

test("decryptResource - returns unchanged buffer when input is non-base64", () => {
  const input = Buffer.from("<html>Hello World</html>", "utf-8");
  const result = decryptResource(input);
  assert.strictEqual(result.toString("utf-8"), "<html>Hello World</html>");
});

test("decryptResource - fails cleanly when invalid key/iv length is provided", () => {
  process.env.MEC_LIVROS_AES_KEY = "short_key";
  process.env.MEC_LIVROS_AES_IV = "short_iv";

  const input = Buffer.from("dGVzdA==", "utf-8");
  assert.throws(
    () => {
      decryptResource(input);
    },
    {
      name: "Error",
      message: /MEC_LIVROS_AES_KEY deve ter exatamente 32 bytes/,
    }
  );
});
