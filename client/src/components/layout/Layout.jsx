import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  // Below the lg breakpoint the sidebar is a slide-out drawer opened from the navbar
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:ml-[220px] min-h-screen min-w-0 print:ml-0 print:min-h-0">
        <Navbar onMenuClick={() => setNavOpen(true)} />
        <main className="p-4 sm:p-6 bg-content-bg min-h-[calc(100vh-64px)] print:p-0 print:bg-white print:min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
