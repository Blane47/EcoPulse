import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen w-full bg-content-bg">
      <Sidebar />
      <div className="ml-[240px] min-h-screen">
        <Navbar />
        <main className="p-8 min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
