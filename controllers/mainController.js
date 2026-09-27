const placeService = require('../services/placeService');
const placeApiService = require('../services/placeApiService');
const kakaoLocalService = require('../services/kakaoLocalService');
const meetingService = require('../services/meetingService');

const getMain = async (req, res, next) => {
    try {
        let mainMeetings = [];
        try {
            mainMeetings = await meetingService.getMainMeetings();
            
        } catch (e) {
            console.warn("메인 데이터를 가져오는데 실패했습니다: ", e.message);
        }
        const markerInfo = await placeService.getAllMarker();
        const surgePlace = await placeService.getSurgeTop5();   //실시간 급증 Top 5
        const placeInfoLimtRaw = await placeService.getPlaceInfoLimt();
        const congestPlaceTopFive = await placeService.getCongestTop5();    //혼잡TOP 3
        const images = await Promise.all(placeInfoLimtRaw.map(p => kakaoLocalService.getPlaceImage(p.name)));
        const placeInfoLimt = placeInfoLimtRaw.map((p, i) => ({ ...p.toObject(), imageUrl: images[i] }));
        res.render('index', { mainMeetings, markerInfo, placeInfoLimt, surgePlace, congestPlaceTopFive, searchError: null });
    } catch (error) {
        next(error);        
    }
}
const getCongestion = async (req, res, next) => {
    try {
        const markerInfo = await placeService.getAllMarker();
        const surgePlace = await placeService.getSurgeTop5();
        const congestPlaceTopFive = await placeService.getCongestTop5();
        const placeInfoLimtRaw = await placeService.getPlaceInfoLimt();
        // getMain과 동일하게 "한산한 명소" 카드의 대표 이미지도 함께 내려준다.
        // (원본 public/js/main.js의 5분 주기 갱신은 이 값을 쓰지 않으므로 필드 추가는 안전하다)
        const images = await Promise.all(placeInfoLimtRaw.map(p => kakaoLocalService.getPlaceImage(p.name)));
        const placeInfoLimt = placeInfoLimtRaw.map((p, i) => ({ ...p.toObject(), imageUrl: images[i] }));
        res.json({ markerInfo, surgePlace, congestPlaceTopFive, placeInfoLimt });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMain, getCongestion };
