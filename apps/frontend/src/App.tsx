import React from "react";
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ForgotPassword from "./components/authPages/ForgotPassword";
import ResetPassword from "./components/authPages/ResetPassword";
import SignUp from "./components/authPages/SignUp";
import SignIn from "./components/authPages/SignIn";
import DashboardLayout from "./components/DashboardLayout";
import ProductsList from "./components/Product/ProductList";
import Calendar from "./pages/Calendar";
import Dashboard from "./pages/Dashboard";
import ProductDetail from "./components/Product/ProductDetail";
import { CartProvider } from "./components/cart/CartContext";
import CartPage from "./components/cart/CartPage";
import LandingPage from "./pages/LandingPage";
import Header from "./components/Header";
import Weather from "./components/weather/WeatherAdvice";
import "./index.css";
import MainLayout from "./components/MainLayout";
import About from "./pages/About";
import PaymentSuccessPage from "./components/cart/PaymentSuccessPage";
import AdviceForm from "./components/advice/DiseaseDetection";
import FarmerProfile from "./components/profile/AdminProfile";
import NewsPage from "./pages/news";
import AdminDashboard from "./components/AdminDashboard";
import AdminDashboard2 from "./components/Admin2Dashboard";
import AdminTransactions from "./components/AdminTransactions";
import AdminListProducts from "./components/AdminListProducts";
import NewPostingPage from "./pages/NewPostingPage";
import FertilizerAdvice from "./components/advice/FertilizerAdvice"
import FarmerAdviceDashboard from "./components/advice/fertlizerAdvice for dashbord";
import BuyerDashboardLayout from "./components/BuyerDashboardLayout";
import RecordFarmerProduct from "./components/Product/RecordFarmerProduct";
import RecordedProductsPage from "./components/Product/PostProduct";
import EscrowManagement from "./components/Escrow/EscrowManagement";
import ActiveEscrows from "./components/Escrow/ActiveEscrows";
import SupplyChainTraceability from "./components/SupplyChain/SupplyChainTraceability";
function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Main Pages with only the Header */}
          <Route element={<MainLayout />}>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<LandingPage />} />
             <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Admin/Farmer routes first - DashboardLayout uses SidebarLayout which shows admin sidebar for admins */}
          <Route element={<DashboardLayout />}>
            <Route path="/profile" element={<FarmerProfile />} />
            <Route path="/create-product" element={<RecordedProductsPage  />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/disease-detection" element={<AdviceForm />} />
            <Route path="/my-advice" element={<FarmerAdviceDashboard />} />
            <Route path="/admin-dashboard2" element={<AdminDashboard2 />} />
            <Route path="/admin-transactions" element={<AdminTransactions />} />
            <Route path="/admin-listings" element={<AdminListProducts />} />
            <Route path="/weather-detector" element={<Weather />} />
            <Route path="/new-posting" element={<NewPostingPage />} />
            <Route path="/fertilizer-advice" element={<FertilizerAdvice />} />
            <Route path="/recordProduct" element={<RecordFarmerProduct />} />
            <Route path="/escrows" element={<ActiveEscrows />} />
            <Route path="/EscrowManagement/:productId" element={<EscrowManagement/>}/>
            <Route path="/supply-chain/:productId" element={<SupplyChainTraceability />} />
          </Route>

          {/* Buyer routes - BuyerDashboardLayout uses BuyerSidebarLayout */}
          <Route element={<BuyerDashboardLayout />}>
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/calendar2" element={<Calendar />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/escrows1" element={<ActiveEscrows />} />
            <Route path="/EscrowManagement/:productId" element={<EscrowManagement/>}/>
            <Route path="/supply-chain/:productId" element={<SupplyChainTraceability />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;