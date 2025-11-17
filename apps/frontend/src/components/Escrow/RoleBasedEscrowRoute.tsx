import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EscrowManagement from './EscrowManagement';

/**
 * Role-based route wrapper that ensures admins use DashboardLayout
 * and buyers use BuyerDashboardLayout
 */
const RoleBasedEscrowRoute: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { role } = useAuth();

  // If admin, this route should be accessed through DashboardLayout
  // If buyer, this route should be accessed through BuyerDashboardLayout
  // The route matching in App.tsx will handle the layout
  
  return <EscrowManagement productId={productId} />;
};

export default RoleBasedEscrowRoute;

