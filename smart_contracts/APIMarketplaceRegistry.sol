// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title APIMarketplaceRegistry
 * @dev Smart contract for registering and managing API listings on blockchain
 * @notice This contract provides immutable proof of API ownership and listing history
 */
contract APIMarketplaceRegistry {
    
    // ==================== STRUCTS ====================
    
    struct APIListing {
        uint256 listingId;           // Unique listing ID
        address seller;              // Seller's wallet address
        string apiName;              // Name of the API
        string baseEndpoint;         // API base URL (optional, can be empty for privacy)
        string[] categories;         // API categories
        uint256 pricePerCall;        // Price in wei per API call
        uint256 quotaAvailable;      // Total quota available
        uint256 quotaSold;           // Quota already sold
        uint256 totalRevenue;        // Total revenue earned (in wei)
        uint256 listedAt;            // Timestamp of listing
        uint256 updatedAt;           // Last update timestamp
        bool isActive;               // Active status
        string metadataUri;          // IPFS URI for additional metadata
    }
    
    struct Purchase {
        uint256 purchaseId;          // Unique purchase ID
        uint256 listingId;           // API listing ID
        address buyer;               // Buyer's wallet address
        uint256 quotaPurchased;      // Amount of quota purchased
        uint256 amountPaid;          // Amount paid in wei
        uint256 purchasedAt;         // Timestamp of purchase
    }
    
    // ==================== STATE VARIABLES ====================
    
    address public owner;
    uint256 public listingCounter;
    uint256 public purchaseCounter;
    uint256 public platformFeePercent = 2; // 2% platform fee
    uint256 public totalPlatformFees;
    
    // Mappings
    mapping(uint256 => APIListing) public listings;
    mapping(address => uint256[]) public sellerListings;
    mapping(address => uint256[]) public buyerPurchases;
    mapping(uint256 => Purchase[]) public listingPurchases;
    mapping(uint256 => Purchase) public purchases;
    
    // ==================== EVENTS ====================
    
    event APIListed(
        uint256 indexed listingId,
        address indexed seller,
        string apiName,
        uint256 pricePerCall,
        uint256 quotaAvailable,
        uint256 timestamp
    );
    
    event APIUpdated(
        uint256 indexed listingId,
        uint256 newPrice,
        uint256 newQuota,
        bool isActive,
        uint256 timestamp
    );
    
    event APIPurchased(
        uint256 indexed purchaseId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 quotaPurchased,
        uint256 amountPaid,
        uint256 timestamp
    );
    
    event APIDelisted(
        uint256 indexed listingId,
        address indexed seller,
        uint256 timestamp
    );
    
    event PlatformFeeUpdated(
        uint256 oldFeePercent,
        uint256 newFeePercent,
        uint256 timestamp
    );
    
    event PlatformFeesWithdrawn(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    // ==================== MODIFIERS ====================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyListingOwner(uint256 _listingId) {
        require(listings[_listingId].seller == msg.sender, "Not listing owner");
        _;
    }
    
    modifier listingExists(uint256 _listingId) {
        require(_listingId > 0 && _listingId <= listingCounter, "Listing does not exist");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor() {
        owner = msg.sender;
        listingCounter = 0;
        purchaseCounter = 0;
    }
    
    // ==================== LISTING FUNCTIONS ====================
    
    /**
     * @dev List a new API on the marketplace
     * @param _apiName Name of the API
     * @param _baseEndpoint Base URL (can be empty for security)
     * @param _categories Array of category strings
     * @param _pricePerCall Price per API call in wei
     * @param _quotaAvailable Total quota to sell
     * @param _metadataUri IPFS URI for additional metadata
     * @return listingId The ID of the newly created listing
     */
    function listAPI(
        string memory _apiName,
        string memory _baseEndpoint,
        string[] memory _categories,
        uint256 _pricePerCall,
        uint256 _quotaAvailable,
        string memory _metadataUri
    ) external returns (uint256) {
        require(bytes(_apiName).length > 0, "API name required");
        require(_pricePerCall > 0, "Price must be greater than 0");
        require(_quotaAvailable > 0, "Quota must be greater than 0");
        
        listingCounter++;
        uint256 newListingId = listingCounter;
        
        APIListing storage newListing = listings[newListingId];
        newListing.listingId = newListingId;
        newListing.seller = msg.sender;
        newListing.apiName = _apiName;
        newListing.baseEndpoint = _baseEndpoint;
        newListing.categories = _categories;
        newListing.pricePerCall = _pricePerCall;
        newListing.quotaAvailable = _quotaAvailable;
        newListing.quotaSold = 0;
        newListing.totalRevenue = 0;
        newListing.listedAt = block.timestamp;
        newListing.updatedAt = block.timestamp;
        newListing.isActive = true;
        newListing.metadataUri = _metadataUri;
        
        sellerListings[msg.sender].push(newListingId);
        
        emit APIListed(
            newListingId,
            msg.sender,
            _apiName,
            _pricePerCall,
            _quotaAvailable,
            block.timestamp
        );
        
        return newListingId;
    }
    
    /**
     * @dev Update an existing API listing
     * @param _listingId ID of the listing to update
     * @param _pricePerCall New price per call
     * @param _additionalQuota Additional quota to add
     * @param _isActive Set active status
     */
    function updateListing(
        uint256 _listingId,
        uint256 _pricePerCall,
        uint256 _additionalQuota,
        bool _isActive
    ) external listingExists(_listingId) onlyListingOwner(_listingId) {
        APIListing storage listing = listings[_listingId];
        
        if (_pricePerCall > 0) {
            listing.pricePerCall = _pricePerCall;
        }
        
        if (_additionalQuota > 0) {
            listing.quotaAvailable += _additionalQuota;
        }
        
        listing.isActive = _isActive;
        listing.updatedAt = block.timestamp;
        
        emit APIUpdated(
            _listingId,
            listing.pricePerCall,
            listing.quotaAvailable,
            _isActive,
            block.timestamp
        );
    }
    
    /**
     * @dev Delist an API (mark as inactive)
     * @param _listingId ID of the listing to delist
     */
    function delistAPI(uint256 _listingId) 
        external 
        listingExists(_listingId) 
        onlyListingOwner(_listingId) 
    {
        listings[_listingId].isActive = false;
        listings[_listingId].updatedAt = block.timestamp;
        
        emit APIDelisted(_listingId, msg.sender, block.timestamp);
    }
    
    // ==================== PURCHASE FUNCTIONS ====================
    
    /**
     * @dev Purchase API quota
     * @param _listingId ID of the listing to purchase from
     * @param _quotaToBuy Amount of quota to purchase
     */
    function purchaseQuota(uint256 _listingId, uint256 _quotaToBuy) 
        external 
        payable 
        listingExists(_listingId) 
    {
        APIListing storage listing = listings[_listingId];
        
        require(listing.isActive, "API listing is not active");
        require(_quotaToBuy > 0, "Quota must be greater than 0");
        require(
            listing.quotaAvailable - listing.quotaSold >= _quotaToBuy,
            "Insufficient quota available"
        );
        
        uint256 totalCost = listing.pricePerCall * _quotaToBuy;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate platform fee
        uint256 platformFee = (totalCost * platformFeePercent) / 100;
        uint256 sellerAmount = totalCost - platformFee;
        
        // Update listing
        listing.quotaSold += _quotaToBuy;
        listing.totalRevenue += totalCost;
        listing.updatedAt = block.timestamp;
        
        // Create purchase record
        purchaseCounter++;
        uint256 newPurchaseId = purchaseCounter;
        
        Purchase memory newPurchase = Purchase({
            purchaseId: newPurchaseId,
            listingId: _listingId,
            buyer: msg.sender,
            quotaPurchased: _quotaToBuy,
            amountPaid: totalCost,
            purchasedAt: block.timestamp
        });
        
        purchases[newPurchaseId] = newPurchase;
        buyerPurchases[msg.sender].push(newPurchaseId);
        listingPurchases[_listingId].push(newPurchase);
        
        // Transfer funds
        totalPlatformFees += platformFee;
        payable(listing.seller).transfer(sellerAmount);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit APIPurchased(
            newPurchaseId,
            _listingId,
            msg.sender,
            _quotaToBuy,
            totalCost,
            block.timestamp
        );
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get listing details
     * @param _listingId ID of the listing
     * @return APIListing struct
     */
    function getListing(uint256 _listingId) 
        external 
        view 
        listingExists(_listingId) 
        returns (APIListing memory) 
    {
        return listings[_listingId];
    }
    
    /**
     * @dev Get all listings by a seller
     * @param _seller Address of the seller
     * @return Array of listing IDs
     */
    function getSellerListings(address _seller) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return sellerListings[_seller];
    }
    
    /**
     * @dev Get all purchases by a buyer
     * @param _buyer Address of the buyer
     * @return Array of purchase IDs
     */
    function getBuyerPurchases(address _buyer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return buyerPurchases[_buyer];
    }
    
    /**
     * @dev Get all purchases for a specific listing
     * @param _listingId ID of the listing
     * @return Array of Purchase structs
     */
    function getListingPurchases(uint256 _listingId) 
        external 
        view 
        listingExists(_listingId) 
        returns (Purchase[] memory) 
    {
        return listingPurchases[_listingId];
    }
    
    /**
     * @dev Get purchase details
     * @param _purchaseId ID of the purchase
     * @return Purchase struct
     */
    function getPurchase(uint256 _purchaseId) 
        external 
        view 
        returns (Purchase memory) 
    {
        require(_purchaseId > 0 && _purchaseId <= purchaseCounter, "Purchase does not exist");
        return purchases[_purchaseId];
    }
    
    /**
     * @dev Get active listings count
     * @return Number of active listings
     */
    function getActiveListingsCount() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }
    
    /**
     * @dev Check if a listing is active and has available quota
     * @param _listingId ID of the listing
     * @return bool indicating availability
     */
    function isListingAvailable(uint256 _listingId) 
        external 
        view 
        listingExists(_listingId) 
        returns (bool) 
    {
        APIListing memory listing = listings[_listingId];
        return listing.isActive && (listing.quotaAvailable > listing.quotaSold);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Update platform fee percentage (only owner)
     * @param _newFeePercent New fee percentage (0-10)
     */
    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 10, "Fee cannot exceed 10%");
        
        uint256 oldFee = platformFeePercent;
        platformFeePercent = _newFeePercent;
        
        emit PlatformFeeUpdated(oldFee, _newFeePercent, block.timestamp);
    }
    
    /**
     * @dev Withdraw accumulated platform fees (only owner)
     * @param _recipient Address to receive the fees
     */
    function withdrawPlatformFees(address payable _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        require(totalPlatformFees > 0, "No fees to withdraw");
        
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        
        _recipient.transfer(amount);
        
        emit PlatformFeesWithdrawn(_recipient, amount, block.timestamp);
    }
    
    /**
     * @dev Transfer ownership (only owner)
     * @param _newOwner Address of new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        owner = _newOwner;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * @dev Get contract balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Calculate purchase cost
     * @param _listingId ID of the listing
     * @param _quota Amount of quota
     * @return totalCost Total cost in wei
     * @return platformFee Platform fee in wei
     * @return sellerAmount Amount seller receives in wei
     */
    function calculatePurchaseCost(uint256 _listingId, uint256 _quota) 
        external 
        view 
        listingExists(_listingId) 
        returns (uint256 totalCost, uint256 platformFee, uint256 sellerAmount) 
    {
        APIListing memory listing = listings[_listingId];
        totalCost = listing.pricePerCall * _quota;
        platformFee = (totalCost * platformFeePercent) / 100;
        sellerAmount = totalCost - platformFee;
    }
}
