import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
