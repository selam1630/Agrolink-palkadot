// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Marketplace {
    uint256 public nextProductId = 1;

    struct Product {
        uint256 id;
        address seller;
        uint256 price; // wei
        string metadataURI; // IPFS or other
        bool sold;
    }

    mapping(uint256 => Product) public products;

    event ProductListed(uint256 indexed productId, address indexed seller, uint256 price, string metadataURI);
    event ProductBought(uint256 indexed productId, address indexed buyer, uint256 price);

    function listProduct(string calldata metadataURI, uint256 price) external {
        uint256 pid = nextProductId++;
        products[pid] = Product({ id: pid, seller: msg.sender, price: price, metadataURI: metadataURI, sold: false });
        emit ProductListed(pid, msg.sender, price, metadataURI);
    }

    function buyProduct(uint256 productId) external payable {
        Product storage p = products[productId];
        require(p.id != 0, "Product does not exist");
        require(!p.sold, "Already sold");
        require(msg.value >= p.price, "Insufficient payment");

        p.sold = true;
        // transfer funds to seller
        (bool sent, ) = p.seller.call{value: msg.value}('');
        require(sent, "Transfer failed");

        emit ProductBought(productId, msg.sender, p.price);
    }
}
