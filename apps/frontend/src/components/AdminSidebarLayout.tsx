import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
  LeafIcon,
  SettingsIcon,
  HelpCircleIcon,
  BarChart3Icon,
  LogOutIcon,
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
          Management Dashboard
        </p>
      </div>

      {/* Navigation Links */}
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

        {/* Farmers Management */}
        <Link
          to="/admin-dashboard2"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/admin-dashboard2")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <UsersIcon className="w-5 h-5" />
          <span className="font-medium">Farmers</span>
        </Link>

        {/* Pending Posts */}
        <Link
          to="/new-posting"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/new-posting")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <ClipboardListIcon className="w-5 h-5" />
          <span className="font-medium">Pending Posts</span>
        </Link>

        {/* Weather Alerts */}
        <Link
          to="/weather-detector"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/weather-detector")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <AlertTriangleIcon className="w-5 h-5" />
          <span className="font-medium">Send Alert</span>
        </Link>

        {/* Soil Advice */}
        <Link
          to="/fertilizer-advice"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/fertilizer-advice")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <LeafIcon className="w-5 h-5" />
          <span className="font-medium">Soil Advice</span>
        </Link>

        {/* Analytics */}
        <Link
          to="/admin-analytics"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/admin-analytics")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <BarChart3Icon className="w-5 h-5" />
          <span className="font-medium">Analytics</span>
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
      </nav>

      {/* Bottom Section */}
      <div className="p-2 space-y-1 border-t border-green-700 mt-auto">
        <Link
          to="/admin-settings"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${hoverBgClass}`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>

        <Link
          to="/help"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${hoverBgClass}`}
        >
          <HelpCircleIcon className="w-5 h-5" />
          <span className="font-medium">Help Center</span>
        </Link>

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
