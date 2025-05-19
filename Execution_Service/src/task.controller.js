"use strict";
const { Router } = require("express");
const axios = require("axios");
const crypto = require("crypto");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const dalService = require("./dal.service");

const router = Router();

/**
 * Generate a proof hash based on the repository, star count, and timestamp
 * @param {string} repo - The repository name
 * @param {number} starCount - The actual star count
 * @param {number} timestamp - The timestamp of the request
 * @returns {string} - The generated hash
 */
function generateProof(repo, starCount, timestamp) {
  const data = `${repo}${starCount}${timestamp}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

router.post("/execute", async (req, res) => {
  console.log("Executing GitHub star checking task");

  try {
    var taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
    const { repo, expected_star_count, tolerance, task_id } = req.body;
    const timestamp = req.body.timestamp || Math.floor(Date.now() / 1000);

    console.log(`taskDefinitionId: ${taskDefinitionId}, repo: ${repo}`);

    if (!repo) {
      return res
        .status(400)
        .send(new CustomError("Repository name is required", {}));
    }

    // Call GitHub API to fetch star count
    const githubResponse = await axios.get(
      `https://api.github.com/repos/${repo}`
    );
    const actual_star_count = githubResponse.data.stargazers_count;

    // Create result object
    const result = {
      is_valid: true,
      repo,
      actual_star_count,
      timestamp,
      task_id: task_id || "unknown",
    };

    // Generate proof
    result.proof = generateProof(repo, actual_star_count, timestamp);

    // Publish to IPFS
    const cid = await dalService.publishJSONToIpfs(result);

    // Send task
    await dalService.sendTask(cid, JSON.stringify(result), taskDefinitionId);

    return res.status(200).send(
      new CustomResponse(
        {
          proofOfTask: cid,
          data: result,
          taskDefinitionId: taskDefinitionId,
        },
        "GitHub star checking task executed successfully"
      )
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send(
        new CustomError("Failed to execute GitHub star checking task", {
          error: error.message,
        })
      );
  }
});

module.exports = router;
