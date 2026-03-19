import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen w-full">
      <Sidebar />
      <div className="ml-[220px] min-h-screen">
        <Navbar />
        <main className="p-6 bg-content-bg min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
