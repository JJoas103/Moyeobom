// 추천 근거의 종류 이름.
//
// kind 는 services/recommendService.js 의 BASE_WEIGHTS 키를 따른다.
//   taste 30 / history 25 / social 20 / area 12 / time 8 / calm 5
//
// 실제 API 는 scoreEvent 가 { factor, label, detail } 로 한글 label 을 직접 내려주고,
// 목업은 { kind, text } 라 label 이 없다. 그래서 화면은 label 이 없을 때만 이 표를 본다.
// mock/ 안에 두면 실데이터를 보는 화면이 목업 모듈에 묶이므로 여기로 뺐다.
export const REASON_LABEL = {
  taste: '취향',
  history: '이력',
  social: '친구',
  area: '동네',
  time: '시간',
  calm: '여유',
}

/** 서버 모양({factor,label,detail})과 목업 모양({kind,text})을 모두 받는다 */
export function reasonLabel(reason) {
  return reason.label || REASON_LABEL[reason.kind] || '추천'
}

export function reasonText(reason) {
  return reason.detail || reason.text || ''
}
