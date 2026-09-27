import { useNavigate, useSearchParams } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { apiPostForm } from '../../api'

// views/meeting/write.ejs 를 옮긴 모임 작성 페이지
function Write() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const area = searchParams.get('area') || ''

  const handleSubmit = async (formData) => {
    await apiPostForm('/api/meeting/write', formData)
    navigate('/meeting/list')
  }

  return (
    <MeetingForm
      heading="모임 만들기"
      initialValues={{ title: '', area, content: '', date: '', time: '', maxParticipants: 4, tags: [] }}
      submitLabel="모임 게시하기"
      cancelTo="/meeting/list"
      onSubmit={handleSubmit}
    />
  )
}

export default Write
