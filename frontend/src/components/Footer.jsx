import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../api'

// views/partials/footer.ejs 를 옮긴 공통 컴포넌트
function Footer() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const socket = io(API_BASE_URL, { withCredentials: true })

    if (user.id) {
      socket.emit('joinUser', user.id)
    }
    if (user.address && user.alert_meeting) {
      socket.emit('joinDistrict', user.address)
    }

    socket.on('newMeetingAlert', (data) => {
      alert(
        '[새 모임 알림]\n' + data.message + '\n\n' + '모임명: ' + data.title + '\n' + '동네: ' + data.district + '\n' + '일시: ' + data.meetingDate,
      )
    })
    socket.on('newFeedAlert', (data) => {
      alert('[새 실시간 제보 알림]\n' + data.message + '\n\n' + '장소: ' + data.district + '\n' + '내용: ' + data.content)
    })

    return () => {
      socket.disconnect()
    }
  }, [user])

  return (
    <footer className="mv-footer">
      <div className="mv-page mv-page--wide d-flex justify-content-between flex-wrap gap-2">
        <span>모여봄</span>
        <span>행사 정보 · 서울 열린데이터광장 문화행사</span>
        <span>1조</span>
      </div>
    </footer>
  )
}

export default Footer
