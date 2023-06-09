const campaignId = args[0]
const zeroRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
const { rpc } = secrets;

const campaignUrl = `https://postmint-backend-staging.azurewebsites.net/api/referrals/functions/${campaignId}`
const campaignResponse = await Functions.makeHttpRequest({
  url: campaignUrl,
  method: "GET",
});
if (campaignResponse.error) {
  console.error(campaignResponse.error)
  throw Error("Could not get campaign information")
}
// get campaign information here
const { tradingPairContract, referrers, fromBlock, toBlock, eventTopics, rewardToken, rewardBudget } = campaignResponse["data"];
console.log("referrers", referrers)
const referees = Object.values(referrers).flat();
console.log("referees", referees);
if (referees.length === 0) {
  return Buffer.from(zeroRoot.slice(2), "hex")
}
const toBytes32 = (address) => {
  address = address.replace("0x", "")
  if (address.length !== 40) {
    throw new Error("Invalid address length")
  }
  return "0x" + address.padStart(64, "0")
}
const toHex = (number) => {
  return "0x" + number.toString(16)
}

var eventStructure = {
  sender: "address",
  recipient: "address",
  amount0: "int256",
  amount1: "int256",
  sqrtPriceX96: "uint160",
  liquidity: "uint128",
  tick: "int24",
}

const decodeEvent = (log) => {
  var decodedLog = {}
  var topicIndex = 1 // topics[0] is the event signature
  var dataIndex = 2
  for (var field in eventStructure) {
    var type = eventStructure[field]

    switch (type) {
      case "address":
        // Addresses are indexed, so they come from topics
        // They are also padded with 24 zeros on the left, so we remove them
        decodedLog[field] = "0x" + log.topics[topicIndex++].slice(26)
        break

      case 'int256':
      case 'uint160':
      case 'uint128':
      case 'int24':
        // These values are not indexed, so they come from data
        // They occupy full 32 bytes (64 characters in hexadecimal)
        // Note that we're not handling the sign for int types correctly
        decodedLog[field] = parseInt(log.data.slice(dataIndex, dataIndex + 64), 16);
        dataIndex += 64;
        break;
    }
  }
  return decodedLog;
}

console.log("tradingPairContract", tradingPairContract)
const router = "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad";
const response = await Functions.makeHttpRequest({
  url: rpc,
  method: "POST",
  data: {
    id: 1,
    jsonrpc: "2.0",
    method: "eth_getLogs",
    params: [{
      address: tradingPairContract,
      fromBlock: toHex(fromBlock),
      toBlock: toHex(toBlock),
      topics: [...eventTopics, toBytes32(router), referees.map(toBytes32)],
    }],
  },
})
if (response.error) {
  console.error(response.error)
  console.log(response["data"])
  throw Error("rpc request failed")
}
const refereeToScore = response["data"]["result"].map(decodeEvent).reduce((result, obj) => {
  const { recipient, amount0 } = obj;
  console.log("recipient", recipient, "amount0", amount0)
  if (result[recipient.toLowerCase()]) {
    result[recipient.toLowerCase()] += amount0;
  } else {
    result[recipient.toLowerCase()] = amount0;
  }
  return result;
}, {});
console.log("refereeToScore", refereeToScore)
if (Object.keys(refereeToScore).length === 0) {
  return Buffer.from(zeroRoot.slice(2), "hex")
}

const referrerToScore = {};
let totalScore = 0;

// score each referrer
for (const [referrer, referees] of Object.entries(referrers)) {
  for (const referee of referees) {
    // check that we have a score for this referee
    if (refereeToScore[referee.toString().toLowerCase()]) {
      // accumulate score for this referrer
      if (referrerToScore[referrer]) {
        referrerToScore[referrer] += refereeToScore[referee.toString().toLowerCase()];
      } else {
        referrerToScore[referrer] = refereeToScore[referee.toString().toLowerCase()];
      }
      totalScore += refereeToScore[referee.toString().toLowerCase()];
    }
  }
}

// initialize with 0 allocations for the zero address
const epochAllocations = {
  "0x0000000000000000000000000000000000000000": {
    "allocations": [
      {
        "token": rewardToken,
        "amount": "0"
      }
    ],
    "epochScore": 0
  }
};
for (const [referrer, score] of Object.entries(referrerToScore)) {
  const reward = Math.round((score / totalScore) * rewardBudget);
  epochAllocations[referrer] = {
    allocations: [{
      token: rewardToken,
      amount: reward.toString(10),
    }],
    epochScore: score
  };
}
console.log("epochAllocations", epochAllocations)
const generateRootUrl = `https://postmint-backend-staging.azurewebsites.net/api/referrals/functions/generateRoot/${campaignId}`;
const generateRootResponse = await Functions.makeHttpRequest({
  url: generateRootUrl,
  method: "POST",
  data: {
    epochAllocations,
  }
});
if (generateRootResponse.error) {
  console.error(generateRootResponse.error)
  throw Error("Could not generate allocations")
}
const { root } = generateRootResponse["data"];
console.log("Generated epoch root", root)
return Buffer.from(root.slice(2), "hex")
