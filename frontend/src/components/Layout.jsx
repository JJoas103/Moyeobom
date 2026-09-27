import Navbar from './Navbar'
import Footer from './Footer'

// 레이아웃 컴포넌트
function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container my-4">{children}</main>
      <Footer />
    </>
  )
}

export default Layout
