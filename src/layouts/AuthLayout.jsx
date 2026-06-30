
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col justify-between">
      <div className="flex-grow flex">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
