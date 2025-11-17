# Escrow System Testing Guide

## 📋 Prerequisites

### 1. **Database Migration**
```bash
cd apps/backend
npx prisma migrate dev --name add_escrow_fields
npx prisma generate
```

### 2. **Deploy Smart Contract**
- Compile the updated `Marketplace.sol`:
  ```bash
  # If using Hardhat/Foundry
  npx hardhat compile
  # or
  forge build
  ```

- Deploy to your testnet (Moonbase Alpha, Moonriver, or local testnet):
  ```bash
  npx hardhat deploy --network moonbase
  # or your deployment script
  ```

- Update environment variables:
  ```env
  # Backend .env
  BLOCKCHAIN_PROVIDER_URL=wss://wss.api.moonbase.moonbeam.network
  MARKETPLACE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
  
  # Frontend .env
  VITE_MARKETPLACE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
  VITE_TX_EXPLORER_URL=https://moonbase.moonscan.io/tx
  VITE_EXPECTED_CHAIN_ID=1287  # Moonbase Alpha
  ```

### 3. **Start Services**
```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev

# Terminal 3: Blockchain Watcher (optional, for event listening)
cd apps/backend
npm run blockchain:watch
```

### 4. **Prepare Test Accounts**
- **Farmer Account**: For listing products
- **Buyer Account**: For purchasing products
- **Admin Account**: For resolving disputes
- **Wallets**: Connect MetaMask with test accounts

---

## 🧪 Testing Flow

### **Test 1: Product Listing with Escrow**

#### Steps:
1. **Login as Farmer**
   - Go to `/sign-in`
   - Login with farmer credentials

2. **List a Product On-Chain**
   - Navigate to product creation page
   - Fill product details (name, price, image)
   - Click "List on Blockchain"
   - Sign transaction in MetaMask
   - Wait for confirmation

#### ✅ Verify:
- [ ] Product appears in product list
- [ ] Product has `onchainId` assigned
- [ ] Transaction visible on blockchain explorer
- [ ] Product status is "available"

---

### **Test 2: Purchase Product (Escrow Activated)**

#### Steps:
1. **Login as Buyer**
   - Logout from farmer account
   - Login with buyer credentials

2. **Purchase Product**
   - Navigate to `/products`
   - Find the product listed by farmer
   - Click "Buy on Blockchain"
   - Sign transaction in MetaMask (send exact price amount)
   - Wait for confirmation

#### ✅ Verify:
- [ ] Transaction successful on blockchain
- [ ] Product status changes to "sold"
- [ ] Funds are held in contract (check contract balance)
- [ ] Escrow status is "pending"
- [ ] Escrow release time is set (7 days from now)
- [ ] Buyer address is recorded

**Check Contract Balance:**
```javascript
// In browser console or ethers script
const contract = new ethers.Contract(contractAddress, abi, provider);
const balance = await contract.getContractBalance();
console.log("Escrowed funds:", ethers.formatEther(balance));
```

---

### **Test 3: View Escrow Status**

#### Steps:
1. **Navigate to Escrow Page**
   - Go to `/EscrowManagement/{productId}`
   - Or view from product detail page if integrated

#### ✅ Verify:
- [ ] Escrow status shows "Pending"
- [ ] Buyer address displayed
- [ ] Seller address displayed
- [ ] Price displayed correctly
- [ ] Release time countdown visible
- [ ] "Confirm Delivery" button visible (for buyer)
- [ ] "Release Escrow" button visible (if 7 days passed)

---

### **Test 4: Confirm Delivery (Immediate Release)**

#### Steps:
1. **As Buyer**
   - Ensure you're logged in as the buyer who purchased
   - Navigate to `/EscrowManagement/{productId}`
   - Click "Confirm Delivery"
   - Sign transaction in MetaMask
   - Wait for confirmation

#### ✅ Verify:
- [ ] Transaction successful
- [ ] Escrow status changes to "Confirmed"
- [ ] Funds released to seller (check seller balance)
- [ ] "Delivery Confirmed" badge appears
- [ ] No more action buttons visible
- [ ] Event `DeliveryConfirmed` emitted on blockchain

**Check Seller Balance:**
```javascript
// Before and after comparison
const sellerBalance = await provider.getBalance(sellerAddress);
console.log("Seller balance:", ethers.formatEther(sellerBalance));
```

---

### **Test 5: Automatic Escrow Release (Time-Based)**

#### Steps:
1. **Wait for Escrow Period**
   - Option A: Wait 7 days (not practical for testing)
   - Option B: Modify contract's `ESCROW_DURATION` to shorter time (e.g., 1 hour) for testing
   - Option C: Manually advance blockchain time (if using local testnet)

2. **Release Escrow**
   - After time period expires
   - Navigate to `/EscrowManagement/{productId}`
   - Click "Release Escrow"
   - Sign transaction in MetaMask
   - Wait for confirmation

#### ✅ Verify:
- [ ] Transaction successful
- [ ] Escrow status changes to "Released"
- [ ] Funds transferred to seller
- [ ] Event `EscrowReleased` emitted
- [ ] Contract balance decreases

---

### **Test 6: Raise Dispute (Buyer)**

#### Steps:
1. **As Buyer**
   - Purchase a product (don't confirm delivery)
   - Navigate to `/EscrowManagement/{productId}`
   - Click "Raise Dispute"
   - Confirm the action
   - Sign transaction in MetaMask

#### ✅ Verify:
- [ ] Transaction successful
- [ ] Escrow status changes to "Disputed"
- [ ] Dispute warning banner appears
- [ ] Escrow is frozen (cannot release)
- [ ] Event `DisputeRaised` emitted
- [ ] Admin can see dispute in active escrows

---

### **Test 7: Raise Dispute (Seller)**

#### Steps:
1. **As Seller**
   - List a product
   - Wait for buyer to purchase
   - Login as seller
   - Navigate to `/EscrowManagement/{productId}`
   - Click "Raise Dispute"
   - Sign transaction

#### ✅ Verify:
- [ ] Seller can raise dispute
- [ ] Same verification as buyer dispute

---

### **Test 8: Resolve Dispute (Admin)**

#### Steps:
1. **Login as Admin**
   - Logout from current account
   - Login with admin/superAdmin credentials

2. **Resolve Dispute**
   - Navigate to `/EscrowManagement/{productId}` with active dispute
   - Click "Favor Buyer" or "Favor Seller"
   - Confirm action
   - Sign transaction in MetaMask

#### ✅ Verify:
- [ ] Transaction successful
- [ ] If favor buyer: Funds refunded to buyer
- [ ] If favor seller: Funds sent to seller
- [ ] Escrow status changes to "Resolved"
- [ ] Dispute banner disappears
- [ ] Event `DisputeResolved` emitted

**Check Balances:**
```javascript
// After resolving in favor of buyer
const buyerBalance = await provider.getBalance(buyerAddress);
// Should have received refund

// After resolving in favor of seller
const sellerBalance = await provider.getBalance(sellerAddress);
// Should have received payment
```

---

### **Test 9: View Active Escrows**

#### Steps:
1. **As Any User**
   - Navigate to `/EscrowManagement` (if you create a list page)
   - Or call API: `GET /api/escrow/active`

#### ✅ Verify:
- [ ] See all products with active escrow
- [ ] Filter by status (pending, disputed)
- [ ] See only your products (if not admin)
- [ ] See all products (if admin)

---

### **Test 10: Edge Cases**

#### Test 10a: Cannot Confirm Delivery Twice
- [ ] Try confirming delivery again → Should fail

#### Test 10b: Cannot Raise Dispute After Confirmation
- [ ] Confirm delivery
- [ ] Try raising dispute → Should fail

#### Test 10c: Cannot Release Before Time
- [ ] Try releasing escrow before 7 days → Should fail

#### Test 10d: Non-Buyer Cannot Confirm
- [ ] Login as different user
- [ ] Try confirming delivery → Should fail

#### Test 10e: Non-Admin Cannot Resolve
- [ ] Login as regular user
- [ ] Try resolving dispute → Should fail

---

## 🔍 Verification Checklist

### **Backend Verification:**
- [ ] All API endpoints return correct data
- [ ] Blockchain watcher captures all events
- [ ] Database updates correctly
- [ ] Escrow status syncs with blockchain

### **Frontend Verification:**
- [ ] Escrow component displays correctly
- [ ] Buttons show/hide based on user role
- [ ] Status badges update in real-time
- [ ] Transaction links work
- [ ] Error messages display properly

### **Blockchain Verification:**
- [ ] All events emitted correctly
- [ ] Funds held in contract
- [ ] Funds released correctly
- [ ] Dispute resolution works
- [ ] Contract balance matches escrowed funds

---

## 🐛 Common Issues & Solutions

### **Issue: "Product not on-chain"**
- **Solution**: Ensure product was listed using "List on Blockchain" button

### **Issue: "Only buyer can confirm"**
- **Solution**: Verify you're logged in as the buyer who purchased

### **Issue: "Escrow period not ended"**
- **Solution**: Wait for 7 days or modify contract duration for testing

### **Issue: "Dispute already raised"**
- **Solution**: Dispute can only be raised once per product

### **Issue: Events not captured**
- **Solution**: 
  - Check blockchain watcher is running
  - Verify RPC URL is correct
  - Check contract address matches

### **Issue: "Insufficient payment"**
- **Solution**: Send exact price amount (in wei) when purchasing

---

## 📊 Expected Results Summary

| Action | Escrow Status | Funds Location | Can Release? |
|--------|--------------|----------------|--------------|
| Purchase | `pending` | Contract | No (wait 7 days) |
| Confirm Delivery | `confirmed` | Seller | N/A (already released) |
| 7 Days Pass | `pending` | Contract | Yes (anyone) |
| Raise Dispute | `disputed` | Contract | No (frozen) |
| Resolve (Buyer) | `resolved` | Buyer (refund) | N/A |
| Resolve (Seller) | `resolved` | Seller (payment) | N/A |

---

## 🎯 Quick Test Script

For rapid testing, use this sequence:

1. **Farmer lists product** → Get `onchainId`
2. **Buyer purchases** → Check escrow status = "pending"
3. **Buyer confirms delivery** → Check status = "confirmed", funds released
4. **New purchase, wait 7 days** → Release escrow → Check status = "released"
5. **New purchase, raise dispute** → Check status = "disputed"
6. **Admin resolves** → Check status = "resolved", funds moved correctly

---

## 📝 Notes

- **Testnet Tokens**: Ensure you have testnet tokens (GLMR, ETH, etc.) for gas fees
- **Network**: Make sure MetaMask is connected to correct network
- **Gas**: Transactions may require significant gas for contract calls
- **Timing**: For time-based tests, consider using a local testnet where you can manipulate time

---

**Happy Testing!** 🚀

