const recommendService = require('../services/recommendService');
const eventApiService = require('../services/eventApiService');
const Meeting = require('../models/Meeting');

// 개인화 추천 홈 — 사용자마다 다른 목록이 뜨고, 각 카드에 추천 근거가 붙는다
const getIndex = async (req, res, next) => {
    try {
        const category = req.query.category || null;
        const { items, isColdStart, hasPreferences } = await recommendService.recommendEvents(req.user, {
            limit: 12,
            category
        });

        res.render('recommend/index', {
            items,
            isColdStart,
            hasPreferences,
            currentCategory: category || ''
        });
    } catch (error) {
        next(error);
    }
};

// 행사 상세 — "선택했을 때 무엇을 보여줄 것인가"에 대한 답이 되는 화면.
// 이 행사에 이미 열려 있는 모임들과, 새로 모임을 만드는 진입점을 함께 보여준다.
const getEventDetail = async (req, res, next) => {
    try {
        const event = await eventApiService.getEventById(req.params.id);
        if (!event) return res.status(404).render('error/404');

        const meetings = await Meeting.find({ event: event._id })
            .populate('author', 'nickname profileImage avatar_emoji manner_score')
            .sort({ meetingDate: 1 })
            .lean();

        const now = new Date();
        const processed = meetings.map((meeting) => ({
            ...meeting,
            isExpired: new Date(meeting.meetingDate) < now,
            isFull:
                meeting.status === 'full' ||
                (meeting.participants || []).length >= meeting.maxParticipants
        }));

        // 로그인한 사용자에게는 이 행사가 왜 추천됐는지도 같이 보여준다
        let reasons = [];
        if (req.user) {
            const ctx = await recommendService.buildContext(req.user);
            reasons = recommendService.scoreEvent(req.user, event, ctx).reasons;
        }

        res.render('recommend/event', { event, meetings: processed, reasons });
    } catch (error) {
        next(error);
    }
};

// 행사 검색 (모임 개설 시 행사를 고르는 화면에서도 사용)
const getSearch = async (req, res, next) => {
    try {
        const keyword = req.query.keyword || '';
        const events = await eventApiService.searchEvents(keyword, 40);
        res.render('recommend/search', { events, keyword });
    } catch (error) {
        next(error);
    }
};

module.exports = { getIndex, getEventDetail, getSearch };
