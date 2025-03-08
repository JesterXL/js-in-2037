import { expect, test } from 'vitest'
import { getPullRequests } from './prs.js'
import FixturePRs from './fixturePRs.json'
import FixturePRs2 from './fixturePRs2.json'

test('get the latest pull requests', async () => {
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
        }
    }
    const stubToken = "fake github token"
    const pullRequests = await getPullRequests({
        fetch: stubFetch,
        token: stubToken,
        totalPages: 2
    })
    expect(pullRequests.length).toBe(6)
})