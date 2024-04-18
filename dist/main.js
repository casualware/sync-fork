"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const token = core.getInput('token', { required: true });
async function run() {
    try {
        const context = github_1.default.context;
        const repoOwner = context.repo.owner;
        const repoName = context.repo.repo;
        const upstream = core.getInput('upstream', { required: true });
        const upstreamBranch = core.getInput('upstreamBranch', { required: true });
        const downstreamBranch = upstreamBranch;
        const downstream = `${repoOwner}/${repoName}`;
        const mergeMethod = core.getInput('mergeMethod', { required: true });
        const autoMerge = core.getInput('autoMerge', { required: true }) === 'true';
        const label = core.getInput('label', { required: true });
        let mergeAttemptCount = parseInt(core.getInput('mergeAttemptCount', { required: true }));
        if (typeof mergeAttemptCount !== 'number' || isNaN(mergeAttemptCount) || mergeAttemptCount < 1) {
            core.warning(`Invalid mergeAttemptCount: ${mergeAttemptCount}. Using default value of 10.`);
            mergeAttemptCount = 10;
        }
        const octokit = github_1.default.getOctokit(token);
        core.info(`Syncing ${upstream}/${upstreamBranch} to ${downstream}/${downstreamBranch}`);
        const pulls = await octokit.rest.search.issuesAndPullRequests({
            q: `label:${label} is:pr is:open repo:${repoOwner}/${repoName} base:${downstreamBranch} head:${upstreamBranch}`,
        });
        // const pulls = await octokit.rest.pulls.list({
        //     owner: repoOwner,
        //     repo: repoName,
        //     base: downstreamBranch,
        //     head: upstreamBranch,
        //     state: 'open',
        //     sort: 'created',
        // });
        let foundPull = pulls.data.items[0];
        if (foundPull) {
            core.info(`Found existing pull request #${foundPull.number}. Closing and recreating.`);
            await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: foundPull.number,
                body: `Closing PR because it is stale. If you want to prevent this, remove the \`${label}\` label from the PR.`,
            });
            await octokit.rest.issues.update({
                owner: repoOwner,
                repo: repoName,
                issue_number: foundPull.number,
                state: 'closed',
                state_reason: 'not_planned',
            });
        }
        const pr = await octokit.rest.pulls.create({
            owner: repoOwner,
            repo: repoName,
            title: `Sync ${upstream}/${upstreamBranch} to ${downstream}/${downstreamBranch}`,
            head_repo: upstream,
            head: upstreamBranch,
            base: downstreamBranch,
            maintainer_can_modify: true,
            body: `This PR was automatically created to sync changes from ${upstream}/${upstreamBranch} to ${downstream}/${downstreamBranch}.`,
        });
        await octokit.rest.issues.update({
            owner: repoOwner,
            repo: repoName,
            issue_number: pr.data.number,
            labels: [label],
        });
        core.info(`Created pull request #${pr.data.number}`);
        core.setOutput('pull_request_number', pr.data.number);
        if (autoMerge) {
            core.info(`Merging pull request with method: ${mergeMethod}`);
            let counter = 0;
            let merged = false;
            while (counter < mergeAttemptCount) {
                // wait for 20 seconds
                await wait(20 * 1000);
                const mergablePr = await octokit.rest.pulls.get({
                    owner: repoOwner,
                    repo: repoName,
                    pull_number: pr.data.number,
                });
                if (mergablePr.data.mergeable) {
                    core.info(`Merging pull request #${pr.data.number}`);
                    const merge = await octokit.rest.pulls.merge({
                        owner: repoOwner,
                        repo: repoName,
                        pull_number: pr.data.number,
                        merge_method: mergeMethod,
                    });
                    merged = true;
                    if (merge.data.merged) {
                        core.info(`Pull request #${pr.data.number} merged successfully.\n${merge.data.sha.slice(0, 7)}: ${merge.data.message}`);
                        core.setOutput('sha', merge.data.sha);
                    }
                    break;
                }
                else if (mergablePr.data.mergeable === false) {
                    core.info(`Pull request #${pr.data.number} is not able to be merged. Skipping merge.`);
                    break;
                }
            }
            if (!merged) {
                core.setFailed(`Failed to merge pull request #${pr.data.number} after ${mergeAttemptCount} attempts.`);
            }
        }
        core.info('Done.');
    }
    catch (err) {
        core.setFailed(err.message);
    }
}
run();
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=main.js.map