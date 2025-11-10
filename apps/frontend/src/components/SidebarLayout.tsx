import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  PackageIcon,
  PlusIcon,
  ClipboardListIcon,
  ActivityIcon,
  LeafIcon,
  CalendarIcon,
  BarChart3Icon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  NewspaperIcon,
  CloudSunIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SidebarLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  const isLoggedIn = true; 
  const isActive = (path: string) => location.pathname === path;

  const sidebarBgClass = "bg-green-800";
  const defaultTextClass = "text-green-100";
  const hoverBgClass = "hover:bg-green-700";
  const { role } = useAuth();
  const activeBgClass = "bg-green-600 text-white";
  const transitionClass = "transition-all duration-300 ease-in-out";

  return (
    <div
      className={`flex flex-col h-screen ${sidebarBgClass} ${defaultTextClass} rounded-r-xl border-r border-green-700`}
    >
      {/* Logo/Brand Area */}
      <div className="p-4 border-b border-green-700">
        <div className="flex items-center justify-center">
          <LeafIcon className="w-8 h-8 text-green-300 mr-2" />
          <h1 className="text-xl font-bold text-white">AgroLink</h1>
        </div>
        <p className="text-xs text-green-300 text-center mt-1">
          Ethiopian Farmers Platform
        </p>
      </div>

      {/* Mobile-only sign-in/sign-up buttons */}
      {!isLoggedIn && (
        <div className="flex flex-col gap-2 px-3 py-3 border-b border-green-700 md:hidden">
          <Link
            to="/sign-in"
            className="flex items-center justify-center w-full px-4 py-2 bg-green-700 text-green-100 rounded-md hover:bg-green-600 transition-colors"
          >
            {t("auth.signIn")}
          </Link>
          <Link
            to="/sign-up"
            className="flex items-center justify-center w-full px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-400 transition-colors"
          >
            {t("auth.signUp")}
          </Link>
        </div>
      )}

      {/* Main Navigation links */}
      <nav className="flex flex-col mt-2 space-y-1 p-2 flex-grow">
        {/* Dashboard Link */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/dashboard")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="font-medium">{t("nav.home") || "Dashboard"}</span>
        </Link>
        <Link
          to="/recordProduct"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/recordProduct")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">
            {t("recordProduct") || "recordProduct"}
          </span>
        </Link>
   <Link
          to="/create-product"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/create-product")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <ClipboardListIcon className="w-5 h-5" />
          <span className="font-medium">Post product</span>
        </Link>

        {/* Pending Posts (Admin) */}
        <Link
          to="/new-posting"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/new-posting")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <ClipboardListIcon className="w-5 h-5" />
          <span className="font-medium">News Posts</span>
        </Link>

        {/* Fertilizer Advice */}
        <Link
          to="/fertilizer-advice"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/fertilizer-advice")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <LeafIcon className="w-5 h-5" />
          <span className="font-medium">
            {t("Soil Advice") || "Fertilizer Advice"}
          </span>
        </Link>
        
        {/* News Link */}
        <Link
          to="admin-dashboard2"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("admin-dashboard2") ? `${activeBgClass} shadow-md` : `${hoverBgClass}`
          }`}
        >
          <NewspaperIcon className="w-5 h-5" />
          <span className="font-medium">{t("create farmers") || "News"}</span>
        </Link>
        {/* Weather Detector Link */}
        <Link
          to="/weather-detector"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/weather-detector")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <CloudSunIcon className="w-5 h-5" /> 
          <span className="font-medium">Send Alert</span>
        </Link>
        <Link
          to="/calendar"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/calendar")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">{t("nav.calendar") || "Calendar"}</span>
        </Link>
        
        {/* Admin-only: On-chain transactions */}
        {role === 'admin' ? (
          <>
          <Link
            to="/admin-listings"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
              isActive('/admin-listings') ? `${activeBgClass} shadow-md` : `${hoverBgClass}`
            }`}
          >
            <PackageIcon className="w-5 h-5" />
            <span className="font-medium">List Products (On‑chain)</span>
          </Link>

          <Link
            to="/admin-transactions"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
              isActive('/admin-transactions') ? `${activeBgClass} shadow-md` : `${hoverBgClass}`
            }`}
          >
            <ClipboardListIcon className="w-5 h-5" />
            <span className="font-medium">On‑chain Tx</span>
          </Link>
          </>
        ) : null}

      <div className="">
        © 2025 AgroLink. All rights reserved. • AgroLink v1.0
      </div>
      </nav>
      
    </div>
  );
};

export default SidebarLayout;