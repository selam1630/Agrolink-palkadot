import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  ClipboardListIcon,
  PackageIcon,
  LogOutIcon,
  Shield,
  LeafIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const AdminSidebarLayout: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const sidebarBgClass = "bg-green-800";
  const defaultTextClass = "text-green-100";
  const hoverBgClass = "hover:bg-green-700";
  const activeBgClass = "bg-green-600 text-white";
  const transitionClass = "transition-all duration-300 ease-in-out";

  return (
    <div
      className={`flex flex-col h-screen ${sidebarBgClass} ${defaultTextClass} rounded-r-xl border-r border-green-700`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-green-700">
        <div className="flex items-center justify-center">
          <LeafIcon className="w-8 h-8 text-green-300 mr-2" />
          <h1 className="text-xl font-bold text-white">AgroLink Admin</h1>
        </div>
        <p className="text-xs text-green-300 text-center mt-1">
          Blockchain Management
        </p>
      </div>

      {/* Navigation Links - Blockchain Only */}
      <nav className="flex flex-col mt-2 space-y-1 p-2 flex-grow">
        {/* Dashboard */}
        <Link
          to="/admin-dashboard"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/admin-dashboard")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </Link>

        {/* List Products On-chain */}
        <Link
          to="/admin-listings"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/admin-listings")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <PackageIcon className="w-5 h-5" />
          <span className="font-medium">List Products (On-chain)</span>
        </Link>

        {/* On-chain transactions */}
        <Link
          to="/admin-transactions"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/admin-transactions")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <ClipboardListIcon className="w-5 h-5" />
          <span className="font-medium">On-chain Tx</span>
        </Link>

        {/* Escrows Management */}
        <Link
          to="/escrows"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/escrows")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="font-medium">Escrows</span>
        </Link>
      </nav>

      {/* Bottom Section - Logout Only */}
      <div className="p-2 space-y-1 border-t border-green-700 mt-auto">
        {/* Logout */}
        <button
          onClick={signOut}
          className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg ${transitionClass} ${hoverBgClass}`}
        >
          <LogOutIcon className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 text-xs text-green-300 text-center border-t border-green-700">
        © 2025 AgroLink Admin Panel
      </div>
    </div>
  );
};

export default AdminSidebarLayout;
