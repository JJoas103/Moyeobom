const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/authMiddleware');
const onboardingController = require('../controllers/onboardingController');

// 취향 설문 (신규 가입 직후 진입, 마이페이지에서 다시 하기도 가능)
router.get('/', isLoggedIn, onboardingController.getOnboarding);
router.post('/', isLoggedIn, onboardingController.postOnboarding);
router.post('/skip', isLoggedIn, onboardingController.postSkip);

module.exports = router;
