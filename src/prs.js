export const getPullRequests = ({ fetch, token, totalPages }) =>
    // Promise.all(
    //     Array.from({ length: totalPages})
    //     .fill(0)
    //     .map(
    //         (i, index) =>
    //             i + index + 1
    //     )
    //     .map(
    //         page =>
    //             fetchPRs(fetch, token, page)
    //     )
    // )
    Array.fromAsync(
        Array.from({ length: totalPages}),
        (_, index) =>
            fetchPRs(fetch, token, index + 1)
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
            Promise.all(
                prs.map(
                    pr =>
                        Promise.all([
                            fetchReviews(fetch, token, pr),
                            fetchComments(fetch, token, pr)
                        ])
                        .then(
                            ([reviews, comments]) =>
                                Promise.all([
                                    reviewsToUserReviews(reviews),
                                    reviewsToUsers(fetch, token, reviews),
                                    commentsToBotReleases(comments)
                                ])
                        )
                        .then(
                            ([reviews, users, botReports]) => {
                                // const reviewsWithEmail =
                                //     reviews.map(
                                //         (review, index) =>
                                //             ({ ...review, email: users[index].email })
                                //     )
                                const reviewsWithEmail =
                                    Array.from(
                                        Array.zip(reviews, users),
                                        ([review, user]) =>
                                            ({ ...review, email: user.email })
                                    )

                                return Promise.resolve({
                                    title: pr.title,
                                    url: pr.html_url,
                                    number: pr.number,
                                    reviews: reviewsWithEmail,
                                    status: getPullRequestsStatus(reviews, botReports),
                                    owner: { login: pr.user.login, avatar: pr.user.avatar },
                                    dateGenerated: new Date().toISOString()
                                })
                            }
                        )
                )
            )
            
    )


const fetchPRs = (fetch, token, page, retry=1) =>
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
    .then(
        r => {
            if(r.status === 200) {
                return r.json()
            } else if(r.status === 403 || r.status === 429) {
                if(retry >= 3) {
                    return Promise.reject(new Error(`Retried ${retry} times and failed.`))
                } else {
                    return delay(r.headers['x-ratelimit-reset'])
                    .then(
                        () =>
                            fetchPRs(fetch, token, page)
                    )
                }
            }
        }
    )

const fetchReviews = (fetch, token, pr) =>
    fetch(
        `https://github.com/JesterXL/final-cow-legend/pulls/${pr.number}/reviews`,
        {
            headers: {
                accept: 'application/vnd.github+json',
                authorization: `token ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    )
    .then( r => r.json() )

const fetchComments = (fetch, token, pr) =>
    fetch(
        `https://github.com/JesterXL/final-cow-legend/issues/${pr.number}/comments`,
        {
            headers: {
                accept: 'application/vnd.github+json',
                authorization: `token ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    )
    .then( r => r.json() )

const reviewsToUserReviews = reviews =>
    reviews.map(
        review => {
            if(review.state === 'APPROVED') {
                return { 
                    login: review.user.login, 
                    avatar: review.user.avatar_url,
                    reviewState: 'Approved'
                }
            } else if(review.state === 'COMMENTED') {
                return { 
                    login: review.user.login, 
                    avatar: review.user.avatar_url,
                    reviewState: 'Commented'
                }
            } else {
                return { 
                    login: review.user.login, 
                    avatar: review.user.avatar_url,
                    reviewState: 'Other'
                }
            }
        }
    )

const reviewsToUsers = (fetch, token, reviews) =>
    Promise.all(
        reviews.map(
            review =>
                review.user.login
        )
        .map(
            login =>
                fetchUser(fetch, token, login)
        )
    )

const fetchUser = (fetch, token, login) =>
    fetch(
        `https://github.com/JesterXL/final-cow-legend/users/${login}`,
        {
            headers: {
                accept: 'application/vnd.github+json',
                authorization: `token ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    )
    .then( r => r.json() )

const commentsToBotReleases = comments =>
    comments.filter(
        comment =>
            comment.user.login === 'bot'
    )
    .map(
        comment =>
            comment.body
    )
    .map(
        body =>
            body.replace(/<\/?[^>]+(>|$)/g, "")
    )
    .map(
        body =>
            body.split('Generated by :CowBot: cowbot via pr_cow_builder').join('')
    )
    .map(
        body => {
            try {
                const result = JSON.parse(body)
                return { success: true, data: result }
            } catch(error) {
                return { success: false, error: error?.message || 'Unknown JSON.parse error.'}
            }
        }
    )
    .filter(
        result =>
            result.sucess === true
    )
    .map(
        result =>
            result.data
    )
    .map(
        botReport => {
            switch(botReport.status.toLowerCase()) {
                case 'awaiting approvers':
                    return 'Awaiting Approval'
                case 'approved':
                    return 'USDA Seleted, FDIC Approved, Checlist Completed ...S.O.B.'
                case 'releasing':
                    return 'Releasing...'
                case 'failed':
                    return 'Failed to Release'
                case 'unknown':
                    return 'Unknown Status'
                default:
                    throw new Error(`Unknown Release Status: ${json.status}`)
            }
        }
    )

const getPullRequestsStatus = (reviews, botReports) => {
    if(botReports.length > 0) {
        return botReports.at(-1)
    }

    const approved = 
        reviews.filter(
            review => 
                review.state === 'Approved')
        .length
    if(approved >= 2) {
        return 'Request JesterXL Approval to Release'
    } else if(approved === 1) {
        return 'Needs 1 more Approver'
    } else {
        return 'Needs 2 Approvers'
    }
}

export const formatPullRequestsForEmail = prs =>
    prs.reduce(
        (acc, currentPR) => {
            const consolidatedReviews = reviewsToConsolidatedReview(currentPR.reviews)
            const reviewsString = consolidatedReviewsToEmailString(consolidatedReviews)
            const whatToDo = pullRequestStatusToActionEmailString(currentPR)
            return `${acc}${currentPR.title}\n${currentPR.url}\nOwner: ${currentPR.owner.login}\n${whatToDo}\n${reviewsString}\n`
        },
        ''
    )
    
const reviewsToConsolidatedReview = reviews =>
    reviews.reduce(
        (acc, currentReview) => {
            if(typeof acc[currentReview.login] === 'undefined') {
                acc[currentReview.login] = {
                    approved: false,
                    commented: false
                }
            }
            if(currentReview.state === 'Approved') {
                acc[currentReview.login].approved = true
            }
            if(currentReview.state === 'Commented') {
                acc[currentReview.login].commented = true
            }
            return acc
        },
        {}
    )

const consolidatedReviewsToEmailString = reviews =>
    Object.keys(reviews).reduce(
        (acc, userKey) => {
            const { approved, commented } = reviews[userKey]
            if(approved && commented) {
                return `${acc}  - ${userKey} has commented & approved\n`
            } else if(approved && commented === false) {
                return `${acc}  - ${userKey} has approved\n`
            } else if(approved === false && commented === true) {
                return `${acc}  - ${userKey} has commented\n`
            } else {
                return acc
            }
        },
        ''
    )

const pullRequestStatusToActionEmailString = pr => {
    switch(pr.status) {
        case 'Needs 2 Approvers':
            return `  - 👀 Needs 2 approvers`
        case 'Needs 1 more Approver':
            return `  - 👀 Needs 1 more approver`
        case 'Request JesterXL Approval to Release':
            return `  - 📬 Email JesterXL for release, all approvers attained.`
        case 'USDA Seleted, FDIC Approved, Checlist Completed ...S.O.B.':
            return `  - 🚢 Need to message JesterXL for a release`
        case 'Releasing...':
            return `  - ⏳ Releasing, please stand by...`
        case 'Failed to Release':
            return `  - ❌ Release failed, JesterXL will be notified to look into it.`
        case 'Unknown Status':
            return `  - ❌ Release is in an unknown status, JesterXL will be notified to look into it.`
    }
}

Array.zip = (a, b) => a.map(
    (e, i) =>
        ( [ a[i], b[i] ])
)

const delay = ms =>
    new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    )