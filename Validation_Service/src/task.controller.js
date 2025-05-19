"use strict";
const { Router } = require("express");
const crypto = require("crypto");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const dalService = require("./dal.service");

const router = Router();

// List of approved repositories (optional validation)
const APPROVED_REPOS = [
  "octocat/Hello-World",
  // Add more approved repos as needed
];

// Maximum time difference in minutes for timestamp validation
const MAX_TIME_DIFF_MINUTES = 10;

/**
 * Verify if a proof is valid
 * @param {string} repo - The repository name
 * @param {number} starCount - The actual star count
 * @param {number} timestamp - The timestamp of the request
 * @param {string} proof - The proof to verify
 * @returns {boolean} - Whether the proof is valid
 */
function verifyProof(repo, starCount, timestamp, proof) {
  const data = `${repo}${starCount}${timestamp}`;
  const expectedProof = crypto.createHash("sha256").update(data).digest("hex");
  return expectedProof === proof;
}

router.post("/validate", async (req, res) => {
  var proofOfTask = req.body.proofOfTask;
  console.log(
    `Validating GitHub star checking task: proof of task: ${proofOfTask}`
  );

  try {
    // Fetch the task result from IPFS
    const taskResult = await dalService.getIPfsTask(proofOfTask);

    // Extract required values from task result
    const {
      repo,
      actual_star_count,
      expected_star_count,
      timestamp,
      proof,
      task_id,
    } = taskResult;
    const tolerance = taskResult.tolerance || 50; // Default tolerance of 50 if not specified

    // 1. Validate repo is part of an approved list (optional)
    if (APPROVED_REPOS.length > 0 && !APPROVED_REPOS.includes(repo)) {
      console.log(`Repository ${repo} is not in the approved list`);
      return res.status(200).send(
        new CustomResponse({
          verified: false,
          reason: "Repository is not approved for validation",
          task_id: task_id || "unknown",
        })
      );
    }

    // 2. Ensure timestamp is within X minutes
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiffMinutes = Math.abs(currentTime - timestamp) / 60;
    if (timeDiffMinutes > MAX_TIME_DIFF_MINUTES) {
      console.log(
        `Timestamp is too old: ${timeDiffMinutes.toFixed(2)} minutes`
      );
      return res.status(200).send(
        new CustomResponse({
          verified: false,
          reason: `Timestamp is ${timeDiffMinutes.toFixed(
            2
          )} minutes old, exceeding the limit of ${MAX_TIME_DIFF_MINUTES} minutes`,
          task_id: task_id || "unknown",
        })
      );
    }

    // 3. Check if actual_star_count is within tolerance of expected_star_count
    const isWithinTolerance =
      Math.abs(actual_star_count - expected_star_count) <= tolerance;
    if (!isWithinTolerance) {
      console.log(
        `Star count outside tolerance: actual=${actual_star_count}, expected=${expected_star_count}, tolerance=${tolerance}`
      );
      return res.status(200).send(
        new CustomResponse({
          verified: false,
          reason: `Actual star count (${actual_star_count}) differs from expected (${expected_star_count}) by more than tolerance (${tolerance})`,
          task_id: task_id || "unknown",
        })
      );
    }

    // 4. Verify proof
    const isProofValid = verifyProof(repo, actual_star_count, timestamp, proof);
    if (!isProofValid) {
      console.log("Invalid proof");
      return res.status(200).send(
        new CustomResponse({
          verified: false,
          reason: "The provided proof does not match the calculated hash",
          task_id: task_id || "unknown",
        })
      );
    }

    // All validations passed
    console.log("Vote: Approve");
    return res.status(200).send(
      new CustomResponse({
        verified: true,
        reason: "Star count is within acceptable range.",
        task_id: task_id || "unknown",
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send(
        new CustomError("Failed to validate GitHub star checking task", {
          error: error.message,
        })
      );
  }
});

module.exports = router;
