// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Marketplace {
    uint256 public nextProductId = 1;
    address public admin; // Platform admin for dispute resolution

    struct Product {
        uint256 id;
        address seller;
        uint256 price; // wei
        string metadataURI; // IPFS or other
        bool sold;
        address buyer;           // Buyer address
        uint256 escrowReleaseTime; // Timestamp when escrow can be released
        bool deliveryConfirmed;   // Buyer confirmed delivery
        bool disputeRaised;      // Dispute has been raised
    }

    mapping(uint256 => Product) public products;
    
    // Escrow duration: 7 days (can be adjusted)
    uint256 public constant ESCROW_DURATION = 7 days;

    event ProductListed(uint256 indexed productId, address indexed seller, uint256 price, string metadataURI);
    event ProductBought(uint256 indexed productId, address indexed buyer, address indexed seller, uint256 price);
    event DeliveryConfirmed(uint256 indexed productId, address indexed buyer);
    event EscrowReleased(uint256 indexed productId, address indexed seller, uint256 amount);
    event DisputeRaised(uint256 indexed productId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed productId, bool favorBuyer, address indexed resolver);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    function listProduct(string calldata metadataURI, uint256 price) external {
        uint256 pid = nextProductId++;
        products[pid] = Product({ 
            id: pid, 
            seller: msg.sender, 
            price: price, 
            metadataURI: metadataURI, 
            sold: false,
            buyer: address(0),
            escrowReleaseTime: 0,
            deliveryConfirmed: false,
            disputeRaised: false
        });
        emit ProductListed(pid, msg.sender, price, metadataURI);
    }

    function buyProduct(uint256 productId) external payable {
        Product storage p = products[productId];
        require(p.id != 0, "Product does not exist");
        require(!p.sold, "Already sold");
        require(msg.value >= p.price, "Insufficient payment");

        p.sold = true;
        p.buyer = msg.sender;
        p.escrowReleaseTime = block.timestamp + ESCROW_DURATION;
        // Funds are held in the contract (escrow)
        // No immediate transfer to seller

        emit ProductBought(productId, msg.sender, p.seller, p.price);
    }

    /**
     * @dev Buyer confirms delivery, releasing funds immediately to seller
     */
    function confirmDelivery(uint256 productId) external {
        Product storage p = products[productId];
        require(p.sold, "Product not sold");
        require(p.buyer == msg.sender, "Only buyer can confirm delivery");
        require(!p.deliveryConfirmed, "Delivery already confirmed");
        require(!p.disputeRaised, "Dispute is active");

        p.deliveryConfirmed = true;
        p.escrowReleaseTime = block.timestamp; // Allow immediate release

        // Transfer funds to seller
        (bool sent, ) = p.seller.call{value: p.price}('');
        require(sent, "Transfer failed");

        emit DeliveryConfirmed(productId, msg.sender);
        emit EscrowReleased(productId, p.seller, p.price);
    }

    /**
     * @dev Release escrow after time period if no dispute
     */
    function releaseEscrow(uint256 productId) external {
        Product storage p = products[productId];
        require(p.sold, "Product not sold");
        require(!p.disputeRaised, "Dispute is active");
        require(block.timestamp >= p.escrowReleaseTime, "Escrow period not ended");
        require(!p.deliveryConfirmed || block.timestamp >= p.escrowReleaseTime, "Cannot release yet");

        // Transfer funds to seller
        (bool sent, ) = p.seller.call{value: p.price}('');
        require(sent, "Transfer failed");

        emit EscrowReleased(productId, p.seller, p.price);
    }

    /**
     * @dev Raise a dispute (buyer or seller can raise)
     */
    function raiseDispute(uint256 productId) external {
        Product storage p = products[productId];
        require(p.sold, "Product not sold");
        require(p.buyer == msg.sender || p.seller == msg.sender, "Only buyer or seller");
        require(!p.disputeRaised, "Dispute already raised");
        require(!p.deliveryConfirmed, "Delivery already confirmed");

        p.disputeRaised = true;
        emit DisputeRaised(productId, msg.sender);
    }

    /**
     * @dev Admin resolves dispute
     * @param favorBuyer true to refund buyer, false to pay seller
     */
    function resolveDispute(uint256 productId, bool favorBuyer) external onlyAdmin {
        Product storage p = products[productId];
        require(p.disputeRaised, "No active dispute");

        if (favorBuyer) {
            // Refund buyer
            (bool sent, ) = p.buyer.call{value: p.price}('');
            require(sent, "Refund failed");
        } else {
            // Pay seller
            (bool sent, ) = p.seller.call{value: p.price}('');
            require(sent, "Transfer failed");
        }

        p.disputeRaised = false;
        emit DisputeResolved(productId, favorBuyer, msg.sender);
    }

    /**
     * @dev Get product details including escrow status
     */
    function getProduct(uint256 productId) external view returns (
        uint256 id,
        address seller,
        address buyer,
        uint256 price,
        bool sold,
        bool deliveryConfirmed,
        bool disputeRaised,
        uint256 escrowReleaseTime
    ) {
        Product memory p = products[productId];
        return (
            p.id,
            p.seller,
            p.buyer,
            p.price,
            p.sold,
            p.deliveryConfirmed,
            p.disputeRaised,
            p.escrowReleaseTime
        );
    }

    /**
     * @dev Update admin address (only current admin)
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }

    /**
     * @dev Get contract balance (should equal total escrowed funds)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
