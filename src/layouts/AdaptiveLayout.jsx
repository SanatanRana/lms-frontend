import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AppLayout from './AppLayout';
import DashboardLayout from './DashboardLayout';

const AdaptiveLayout = () => {
  const { user } = useContext(AuthContext);
  return user ? <DashboardLayout /> : <AppLayout />;
};

export default AdaptiveLayout;
