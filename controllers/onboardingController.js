const User = require('../models/User');
const options = require('../config/onboardingOptions');

// 온보딩 설문 화면
const getOnboarding = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).lean();

        res.render('member/onboarding', {
            options,
            // 다시 들어왔을 때 기존 선택을 유지한다
            saved: (user && user.preferences) || {},
            isRedo: Boolean(user && user.onboardedAt)
        });
    } catch (error) {
        next(error);
    }
};

// 설문 저장
const postOnboarding = async (req, res, next) => {
    try {
        const preferences = {
            genres: options.sanitize(req.body.genres, options.GENRES),
            hobbies: options.sanitize(req.body.hobbies, options.HOBBIES),
            personality: options.sanitize(req.body.personality, options.PERSONALITIES),
            preferredTime: options.sanitize(req.body.preferredTime, options.TIME_SLOTS),
            preferredAreas: options.sanitize(req.body.preferredAreas, options.AREAS)
        };

        await User.findByIdAndUpdate(req.user.id, {
            $set: { preferences, onboardedAt: new Date() }
        });

        res.redirect('/recommend');
    } catch (error) {
        next(error);
    }
};

// 건너뛰기 — 다시 묻지 않도록 완료로 기록하되 선호는 비워 둔다.
// 이 경우 추천은 지역·혼잡도·신선도만으로 순위를 매긴다.
const postSkip = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $set: { onboardedAt: new Date() } });
        res.redirect('/recommend');
    } catch (error) {
        next(error);
    }
};

// 로그인 직후 분기 — 설문을 아직 안 한 사용자는 온보딩으로 보낸다
const afterLogin = async (req, res, next) => {
    try {
        if (!req.user) return res.redirect('/member/login');

        const user = await User.findById(req.user.id).select('onboardedAt').lean();
        if (user && !user.onboardedAt) return res.redirect('/onboarding');

        res.redirect('/');
    } catch (error) {
        next(error);
    }
};

module.exports = { getOnboarding, postOnboarding, postSkip, afterLogin };
