import React, { useState } from "react";
import type { ChangeEvent } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
    User, Package, DollarSign, Phone, Banknote, MapPin, UploadCloud, Loader2,
    Ruler, ShieldCheck, Info
} from "lucide-react"; 

const Label = LabelPrimitive.Root;
const FieldDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs text-gray-500 mt-1 flex items-center">
        <Info className="w-3 h-3 mr-1 text-green-500" /> {children}
    </p>
);

const RecordFarmerProduct: React.FC = () => {
  const navigate = useNavigate();
  const { token, loading, role } = useAuth();

  const [formData, setFormData] = useState({
    farmerName: "",
    farmerPhone: "",
    bankAccount: "",
    productName: "",
    amount: "",
    pricePerUnit: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const productData = {
      ...formData,
      productImage: imagePreview, 
    };

    try {
      const response = await fetch("https://agrolink-updated-2-5.onrender.com/api/farmer-products/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to record farmer product.");
      }

      setMessage("Product recorded successfully! Preparing for next entry...");
      setFormData({
        farmerName: "",
        farmerPhone: "",
        bankAccount: "",
        productName: "",
        amount: "",
        pricePerUnit: "",
      });
      setImageFile(null);
      setImagePreview("");
    } catch (error) {
      console.error("Error recording product:", error);
      if (error instanceof Error) {
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage("❌ Failed to record farmer product. Please check the network connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50 p-6">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-green-700" />
        <p className="text-xl text-green-800 font-bold">Loading user data...</p>
      </div>
    );
  }

  if (!token || role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6">
        <p className="text-2xl text-red-600 font-bold mb-6 text-center">
          <MapPin className="inline-block h-6 w-6 mr-2" /> Unauthorized Access
        </p>
        <p className="text-lg text-gray-700 mb-6 text-center">
            Only administrators are permitted to access this product recording form.
        </p>
        <Button
          onClick={() => navigate("/sign-in")}
          className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50 p-4 md:p-10">
      {/* Increased max width and enhanced shadow/border */}
      <Card className="w-full max-w-5xl shadow-2xl rounded-2xl border-4 border-green-200 bg-white/95 backdrop-blur-sm transition-all duration-500">
        
        <CardHeader className="border-b-4 border-green-100/70 px-8 py-7">
          <CardTitle className="flex items-center text-4xl font-black text-green-900 tracking-tight">
            <ShieldCheck className="w-9 h-9 mr-3 text-green-600" /> 
           Product Intake Form
          </CardTitle>
          <p className="text-md text-green-700 mt-2">
            Please fill in all mandatory fields to securely record the farmer's product entry into the inventory system.
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="px-8 py-10 space-y-10">
            
            {/* --- Farmer Info Section - Enhanced Fieldset --- */}
            <fieldset className="border p-6 rounded-xl border-green-300 bg-green-50/50 shadow-lg">
              <legend className="px-3 text-xl font-extrabold text-green-800 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Farmer Details
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mt-4">
                
                {/* Farmer Name */}
                <div className="space-y-2">
                  <Label htmlFor="farmerName" className="flex items-center text-sm font-bold text-green-800">
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="farmerName"
                    name="farmerName"
                    value={formData.farmerName}
                    onChange={handleChange}
                    placeholder="e.g., Alice Mamo"
                    required
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                  <FieldDescription>Full legal name of the product owner.</FieldDescription>
                </div>
                
                {/* Farmer Phone */}
                <div className="space-y-2">
                  <Label htmlFor="farmerPhone" className="flex items-center text-sm font-bold text-green-800">
                    Phone Number <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="farmerPhone"
                    name="farmerPhone"
                    value={formData.farmerPhone}
                    onChange={handleChange}
                    placeholder="e.g., +251912345678"
                    required
                    type="tel"
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                  <FieldDescription>Include country code for verification.</FieldDescription>
                </div>
                
                {/* Bank Account */}
                <div className="space-y-2 md:col-span-2"> 
                  <Label htmlFor="bankAccount" className="flex items-center text-sm font-bold text-green-800">
                    <Banknote className="w-4 h-4 mr-2 opacity-75" /> Bank Account Number <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="bankAccount"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    placeholder="Enter full bank account number"
                    required
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                   <FieldDescription>Used for payment disbursement. Double check for accuracy.</FieldDescription>
                </div>
              </div>
            </fieldset>

            {/* --- Product Info Section - Enhanced Fieldset --- */}
            <fieldset className="border p-6 rounded-xl border-green-300 shadow-lg">
              <legend className="px-3 text-xl font-extrabold text-green-800 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Product Details
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mt-4">
                
                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="productName" className="flex items-center text-sm font-bold text-green-800">
                    Product Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="e.g., Teff Grain"
                    required
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                   <FieldDescription>Specify type and grade (if applicable).</FieldDescription>
                </div>
                
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center text-sm font-bold text-green-800">
                    <Ruler className="w-4 h-4 mr-2 opacity-75" /> Amount (e.g., in kg) <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    min={1}
                    placeholder="e.g., 50 (in kg)"
                    required
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                   <FieldDescription>Total quantity of the product.</FieldDescription>
                </div>
                
                {/* Price per Unit */}
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit" className="flex items-center text-sm font-bold text-green-800">
                    <DollarSign className="w-4 h-4 mr-2 opacity-75" /> Price per Unit <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    name="pricePerUnit"
                    value={formData.pricePerUnit}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="e.g., 12.50 ETB"
                    required
                    className="h-11 border-green-300 focus:border-green-600"
                  />
                   <FieldDescription>The agreed price for one unit (e.g., 1 kg).</FieldDescription>
                </div>
              </div>
            </fieldset>

            {/* --- Image Upload Section - Enhanced Layout --- */}
            <div className="mt-8 border-t pt-8 border-green-200">
              <h3 className="text-2xl font-extrabold text-green-800 flex items-center mb-6">
                <UploadCloud className="w-5 h-5 mr-3" />
                Product Visual Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                
                {/* File Input */}
                <div className="space-y-2">
                  <Label htmlFor="productImage" className="flex items-center text-sm font-bold text-green-800">
                    Image Upload (JPEG/PNG)
                  </Label>
                  <Input
                    id="productImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file:text-green-700 file:font-semibold file:border-green-400 file:rounded-lg file:py-2 file:px-4 hover:file:bg-green-100 cursor-pointer"
                  />
                  <FieldDescription>High-resolution image of the product for quality control.</FieldDescription>
                </div>
                
                {/* Image Preview */}
                <div className="min-h-[160px]">
                    {imagePreview ? (
                        <div className="border-4 border-dashed border-green-400 rounded-xl p-4 bg-green-100/70 shadow-inner h-full">
                            <p className="text-center text-sm font-bold text-green-800 mb-3">Preview</p>
                            <img
                            src={imagePreview}
                            alt="Product Preview"
                            className="w-full max-h-56 object-contain rounded-lg shadow-md transition-all duration-500"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[160px] border-4 border-dashed border-green-300 rounded-xl bg-green-50/50 text-green-600 p-4">
                            <UploadCloud className="w-8 h-8 mb-2" />
                            <span className="text-lg font-medium text-center">No Image Selected</span>
                        </div>
                    )}
                </div>
              </div>
            </div>
            
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-center px-8 py-6 border-t-4 border-green-100/70 bg-green-100/40 rounded-b-2xl">
            {/* Message Area */}
            {message && (
              <p
                className={`text-lg font-bold transition-opacity duration-500 mb-4 sm:mb-0 sm:mr-4 ${
                  message.startsWith("❌") 
                    ? "text-red-700 bg-red-100/80 border border-red-300 p-2.5 rounded-lg shadow-sm" 
                    : "text-green-800 bg-green-200/80 border border-green-400 p-2.5 rounded-lg shadow-sm"
                }`}
              >
                {message}
              </p>
            )}
            
            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto text-xl font-bold px-12 py-4 bg-green-700 text-white rounded-full shadow-2xl hover:bg-green-800 transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Finalizing Record...
                </>
              ) : (
                "Record Product"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RecordFarmerProduct;