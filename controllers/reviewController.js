const friendService = require('../services/friendService');

// 평가 불가 사유(기간 만료, 미참여, 중복 제출)는 400으로 내려 보내
// errorMiddleware가 사유 문구와 함께 안내 페이지를 렌더링하게 한다.
const asBadRequest = (error) => {
    error.status = 400;
    return error;
};

// 평가 화면 — "좋은 모임이 되셨나요?"
const getReview = async (req, res, next) => {
    try {
        const { meeting, others, deadline, existingReview } = await friendService.getReviewContext(
            req.params.id,
            req.user.id
        );

        if (existingReview) {
            return res.render('meeting/review_done', { meeting, review: existingReview });
        }

        res.render('meeting/review', { meeting, others, deadline });
    } catch (error) {
        next(asBadRequest(error));
    }
};

// 평가 제출 → 상호 지목이면 친구 성립
const postReview = async (req, res, next) => {
    try {
        const satisfied = req.body.satisfied === 'yes';

        // 체크박스는 1개만 선택하면 문자열, 여러 개면 배열로 넘어온다
        let targetIds = req.body.targets || [];
        if (!Array.isArray(targetIds)) targetIds = [targetIds];

        const { matched } = await friendService.submitReview(
            req.params.id,
            req.user.id,
            satisfied,
            targetIds
        );

        // 친구가 성립한 건에 대해서만 양쪽에 실시간 알림을 보낸다.
        // 한쪽만 지목한 경우에는 상대에게 아무것도 보내지 않는다.
        const io = req.app.get('io');
        for (const friendship of matched) {
            friendService.emitMatch(io, friendship);
        }

        res.render('meeting/review_result', {
            matchedCount: matched.length,
            satisfied,
            meetingId: req.params.id
        });
    } catch (error) {
        next(asBadRequest(error));
    }
};

module.exports = { getReview, postReview };
