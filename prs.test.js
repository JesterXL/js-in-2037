import { expect, test } from 'vitest'
import { getPullRequests } from './prs.js'

test('get the latest pull requests', async () => {
    const stubFetch = url => {
        return Promise.resolve(
            {
                json: () => Promise.resolve([1, 2, 3, 4, 5, 6])
            }
        )
    }
    const stubToken = "fake github token"
    const pullRequests = await getPullRequests(stubFetch, stubToken)
    expect(pullRequests.length).toBe(6)
})