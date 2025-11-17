import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PackageIcon, CalendarIcon, LeafIcon, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "./Header";

const BuyerSidebarLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const isLoggedIn = true;
  const isActive = (path: string) => location.pathname === path;

  // Same style constants as admin sidebar
  const sidebarBgClass = "bg-green-800";
  const defaultTextClass = "text-green-100";
  const hoverBgClass = "hover:bg-green-700";
  const activeBgClass = "bg-green-600 text-white";
  const transitionClass = "transition-all duration-300 ease-in-out";

  return (
    <div
      className={`flex flex-col h-screen w-64 ${sidebarBgClass} ${defaultTextClass} rounded-r-xl border-r border-green-700`}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-green-700">
        <div className="flex items-center justify-center">
          <LeafIcon className="w-8 h-8 text-green-300 mr-2" />
          <h1 className="text-xl font-bold text-white">AgroLink</h1>
        </div>
        <p className="text-xs text-green-300 text-center mt-1">
          Ethiopian Farmers Platform
        </p>
      </div>

      {/* Buyer Navigation */}
      <nav className="flex flex-col mt-2 space-y-1 p-2 flex-grow">
        {/* Products Link */}
        <Link
          to="/products"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/products")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <PackageIcon className="w-5 h-5" />
          <span className="font-medium">{t("nav.products") || "Products"}</span>
        </Link>
 {/* Escrows Link */}
 <Link
          to="/escrows1"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/escrows")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="font-medium">My Escrows</span>
        </Link>
        {/* Calendar Link */}
        <Link
          to="/calendar2"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg ${transitionClass} ${
            isActive("/calendar2")
              ? `${activeBgClass} shadow-md`
              : `${hoverBgClass}`
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">{t("nav.calendar") || "Calendar"}</span>
        </Link>

       
      </nav>

      {/* Footer */}
      <div className="text-xs text-center text-green-300 border-t border-green-700 py-3">
        © 2025 AgroLink<br />All rights reserved.
      </div>
    </div>
  );
};

export default BuyerSidebarLayout;
