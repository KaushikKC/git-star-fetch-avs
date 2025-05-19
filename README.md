
# GitHub Star Fetch AVS Example

This repository demonstrates how to implement a GitHub Star Checker AVS using the Othentic Stack.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Usage](#usage)

---

## Overview

The GitHub Star Fetch AVS Example demonstrates how to deploy an AVS that verifies the number of stars for GitHub repositories using the Othentic Stack.

### Features

- **GitHub Star Verification:** Checks if a repository has the expected number of stars within a specified tolerance.
- **Containerized deployment:** Simplifies deployment and scaling.
- **Prometheus and Grafana integration:** Enables real-time monitoring and observability.

## Project Structure

```mdx
📂 git-star-fetch-avs
├── 📂 Execution_Service         # Implements Task execution logic - Express JS Backend
│   ├── 📂 config/
│   │   └── app.config.js        # An Express.js app setup with dotenv, and a task controller route for handling `/task` endpoints.
│   ├── 📂 src/
│   │   └── dal.service.js       # A module that interacts with Pinata for IPFS uploads
│   │   ├── task.controller.js   # An Express.js router handling a `/execute` POST endpoint for GitHub star checking
│   │   ├── 📂 utils             # Defines two custom classes, CustomResponse and CustomError, for standardizing API responses
│   ├── Dockerfile               # A Dockerfile that sets up a Node.js environment, exposes port 4003, and runs the application via index.js
|   ├── index.js                 # A Node.js server entry point that initializes the DAL service, loads the app configuration, and starts the server on the specified port
│   └── package.json             # Node.js dependencies and scripts
│
├── 📂 Validation_Service        # Implements task validation logic - Express JS Backend
│   ├── 📂 config/
│   │   └── app.config.js        # An Express.js app setup with a task controller route for handling `/task` endpoints.
│   ├── 📂 src/
│   │   └── dal.service.js       # A module that retrieves data from IPFS
│   │   ├── task.controller.js   # An Express.js router handling a `/validate` POST endpoint for GitHub star validation
│   │   ├── validator.service.js # A validation module that verifies if GitHub star count is within the expected range
│   │   ├── 📂 utils             # Defines two custom classes, CustomResponse and CustomError, for standardizing API responses.
│   ├── Dockerfile               # A Dockerfile that sets up a Node.js environment, exposes port 4002, and runs the application via index.js.
|   ├── index.js                 # A Node.js server entry point that initializes the DAL service, loads the app configuration, and starts the server on the specified port.
│   └── package.json             # Node.js dependencies and scripts
│
├── 📂 grafana                   # Grafana monitoring configuration
├── docker-compose.yml           # Docker setup for Operator Nodes (Performer, Attesters, Aggregator), Execution Service, Validation Service, and monitoring tools
├── docker-compose.prod.yml      # Production Docker setup with additional monitoring stack
├── .env.example                 # An example .env file containing configuration details and contract addresses
├── README.md                    # Project documentation
└── prometheus.yaml              # Prometheus configuration for logs
```

## Architecture

The GitHub Star Fetch AVS implements the following workflow:

### 🔹 Execution Flow

The Performer node executes tasks using the Task Execution Service and sends the results to the p2p network.

Task Execution logic:
1. Receive parameters: `repo`, `expected_star_count`, `tolerance`, `task_id`, and `timestamp`
2. Call GitHub public API and fetch the `stargazers_count` for the specified repository
3. Structure the result with `is_valid`, `repo`, `actual_star_count`, `timestamp`, and `task_id`
4. Generate a cryptographic proof (hash) of the result payload
5. Store the result in IPFS
6. Share the IPFS CID as proof

### 🔸 Verification Flow

Attester Nodes validate task execution through the Validation Service. Based on the Validation Service's response, attesters sign the tasks.

Validation Service logic:
1. Retrieve data from IPFS using the CID
2. Validate `repo` is part of an approved list (optional)
3. Ensure the `timestamp` is within an acceptable time window
4. Check if `actual_star_count` is within ±`tolerance` of `expected_star_count`
5. Confirm the proof matches the hash of the data
6. Return verification result

---

## Prerequisites

- Node.js (v 22.6.0)
- Foundry
- [Yarn](https://yarnpkg.com/)
- [Docker](https://docs.docker.com/engine/install/)
- GitHub API access (for repository star counts)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/KaushikKC/git-star-fetch-avs.git
   cd git-star-fetch-avs
   ```

2. Install Othentic CLI:

   ```bash
   npm i -g @othentic/othentic-cli
   ```

3. Create a `.env` file from the provided `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values:
   - Pinata API keys for IPFS storage
   - Private keys for Performer, Aggregator, and Attesters
   - RPC URLs for your selected networks

## Usage

### Testing the GitHub Star Checker

1. Start the services:

   ```bash
   docker-compose up -d
   ```

2. Execute a GitHub star checking task:

   ```bash
   curl -X POST http://localhost:4003/task/execute \
     -H "Content-Type: application/json" \
     -d '{ 
           "repo": "octocat/Hello-World", 
           "expected_star_count": 1500, 
           "tolerance": 50, 
           "task_id": "xyz789"
         }'
   ```

3. Validate a GitHub star checking task (internal to the system):

   The validation happens automatically within the AVS, but you can also manually test it:

   ```bash
   curl -X POST http://localhost:4002/task/validate \
     -H "Content-Type: application/json" \
     -d '{ 
           "proofOfTask": "ipfs-cid-from-execution-step"
         }'
   ```

### Production Deployment

For production deployment, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This includes the monitoring stack with Prometheus and Grafana.

### Customization

Modify the following aspects to suit your specific use case:
- Add approved repositories list in the validation service
- Adjust the tolerance for star count verification
- Change the time window for timestamp validation

Happy Building! 🚀
