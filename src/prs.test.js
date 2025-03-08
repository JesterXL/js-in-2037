import { expect, test } from 'vitest'
import { getPullRequests, formatPullRequestsForEmail } from './prs.js'
import FixturePRs from './fixturePRs.json'
import FixturePRs2 from './fixturePRs2.json'
import FixtureReviews from './fixtureReviews.json'
import FixtureComments from './fixtureComments.json'

const stubFetch = url => {
    if(url === 'https://github.com/JesterXL/final-cow-legend/pulls?state=open&per_page=100&page=1') {
        return Promise.resolve(
            {
                json: () => Promise.resolve(FixturePRs)
            }
        )
    } else if(url === 'https://github.com/JesterXL/final-cow-legend/pulls?state=open&per_page=100&page=2') {
        return Promise.resolve(
            {
                json: () => Promise.resolve(FixturePRs2)
            }
        )
    } else if(url.split('/').at(-1) === 'reviews') {
        return Promise.resolve({ json: () => Promise.resolve(FixtureReviews)})
    } else {
        return Promise.resolve({ json: () => Promise.resolve(FixtureComments)})
    }
}
const stubToken = "fake github token"

test('get the latest pull requests', async () => {
    const pullRequests = await getPullRequests({
        fetch: stubFetch,
        token: stubToken,
        totalPages: 2
    })
    expect(pullRequests.length).toBe(6)
})

test('format pull requests for email', async () => {
    const expected = `Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

Amazing new feature
https://github.com/octocat/Hello-World/pull/1347
Owner: JesterXL
  - 👀 Needs 2 approvers

`
    const pullRequests = await getPullRequests({
        fetch: stubFetch,
        token: stubToken,
        totalPages: 2
    })
    const result = formatPullRequestsForEmail(pullRequests)
    expect(result).toBe(expected)
})