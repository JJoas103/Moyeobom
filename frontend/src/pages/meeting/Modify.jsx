import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPostForm } from '../../api'
import ErrorMessage from '../../components/ErrorMessage'

// views/meeting/modify.ejs 를 옮긴 모임 수정 페이지
function Modify() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMeeting(null)

    apiGet(`/api/meeting/info/${id}`)
      .then((data) => {
        if (!cancelled) setMeeting(data.meeting)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error || !meeting) {
    return <ErrorMessage statusCode={error?.status || 404} message={error?.message || '모임을 찾을 수 없습니다'} />
  }

  if (!user || user.id !== meeting.author._id) {
    return <ErrorMessage statusCode={403} message="권한이 없습니다" />
  }

  const meetingDate = new Date(meeting.meetingDate)
  const initialValues = {
    title: meeting.title,
    area: meeting.area,
    congestionLevel: meeting.congestionLevel,
    content: meeting.content,
    date: meetingDate.toISOString().split('T')[0],
    time: meetingDate.toTimeString().slice(0, 5),
    maxParticipants: meeting.maxParticipants,
    tags: meeting.tags,
    existingImageUrl: meeting.imageUrl,
  }

  const handleSubmit = async (formData) => {
    await apiPostForm(`/api/meeting/modify/${id}`, formData)
    navigate(`/meeting/info/${id}`)
  }

  return (
    <MeetingForm
      heading="모임 수정"
      initialValues={initialValues}
      submitLabel="수정 완료"
      cancelTo={`/meeting/info/${id}`}
      onSubmit={handleSubmit}
    />
  )
}

export default Modify
