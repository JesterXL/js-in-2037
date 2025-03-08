export const getPullRequests = ({ fetch, token, totalPages }) =>
    Promise.all(
        Array(totalPages)
        .fill(0)
        .map(
            (i, index) =>
                i + index + 1
        )
        .map(
            page =>
                fetchPRs(fetch, token, page)
        )
    )
    .then(
        prsArray =>
            prsArray.flat()
    )
    .then(
        prs =>
            prs.filter(
                pr => pr.draft === false
            )
    )
    .then(
        prs =>
            prs.filter(
                pr =>
                    pr.user.login === 'JesterXL'
            )
    )


const fetchPRs = (fetch, token, page) =>
    fetch(
        `https://github.com/JesterXL/final-cow-legend/pulls?state=open&per_page=100&page=${page}`,
        {
            headers: {
                accept: 'application/vnd.github+json',
                authorization: `token ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    )
    .then( r => r.json() )