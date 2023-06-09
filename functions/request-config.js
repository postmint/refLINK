const fs = require("fs")
const path = require("path")

// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config()

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

const requestConfig = {
  codeLocation: Location.Inline,
  codeLanguage: CodeLanguage.JavaScript,
  source: fs.readFileSync(path.resolve(__dirname, "source.js")).toString(),
  args: ["64830266c74d53d882c0ed7b"],
  expectedReturnType: ReturnType.bytes,
  secrets: { rpc: process.env.QUICKNODE_URL },
  secretsURLs: ["https://api.npoint.io/54fa86b526bb2f61901a"],
  walletPrivateKey: process.env["PRIVATE_KEY"],
}

module.exports = requestConfig
