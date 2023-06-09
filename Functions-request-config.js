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
  secrets: { rpcUrl: process.env.QUICKNODE_URL },
  source: fs.readFileSync(path.resolve(__dirname, "source.js")).toString(),
  args: ["6480f58c4c0a2238dd256222"],
  expectedReturnType: ReturnType.bytes,
  secretsURLs: ["https://api.npoint.io/54fa86b526bb2f61901a"],
}

module.exports = requestConfig
