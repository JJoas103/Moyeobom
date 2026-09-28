import Navbar from './Navbar'
import Footer from './Footer'

// 레이아웃 컴포넌트
function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="mv-page">{children}</main>
      <Footer />
    </>
  )
}

export default Layout
