//
//  BrandKitTests.swift
//  StreamerStudioTests
//
//  Unit tests for brand kit models and functionality.
//

import XCTest
@testable import StreamerStudioCore
@testable import StreamerStudioLib

final class BrandKitTests: XCTestCase {
    
    // MARK: - Properties
    
    private var decoder: JSONDecoder!
    private var encoder: JSONEncoder!
    
    // MARK: - Setup
    
    override func setUp() {
        super.setUp()
        
        decoder = JSONDecoder()
        // Don't use convertFromSnakeCase since we have explicit CodingKeys
        decoder.dateDecodingStrategy = .iso8601
        
        encoder = JSONEncoder()
        // Don't use convertToSnakeCase since we have explicit CodingKeys
    }
    
    override func tearDown() {
        decoder = nil
        encoder = nil
        super.tearDown()
    }
    
    // MARK: - BrandKit Decoding Tests
    
    func testBrandKitDecoding() throws {
        let json = """
        {
            "id": "test-id",
            "user_id": "user-123",
            "name": "Test Brand",
            "is_active": true,
            "primary_colors": ["#FF5733", "#3498DB"],
            "accent_colors": ["#F1C40F"],
            "fonts": {"headline": "Montserrat", "body": "Inter"},
            "logo_url": null,
            "tone": "competitive",
            "style_reference": "Bold gaming style",
            "extracted_from": null,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
        """.data(using: .utf8)!
        
        let brandKit = try decoder.decode(BrandKit.self, from: json)
        
        XCTAssertEqual(brandKit.id, "test-id")
        XCTAssertEqual(brandKit.userId, "user-123")
        XCTAssertEqual(brandKit.name, "Test Brand")
        XCTAssertTrue(brandKit.isActive)
        XCTAssertEqual(brandKit.primaryColors, ["#FF5733", "#3498DB"])
        XCTAssertEqual(brandKit.accentColors, ["#F1C40F"])
        XCTAssertEqual(brandKit.fonts.headline, "Montserrat")
        XCTAssertEqual(brandKit.fonts.body, "Inter")
        XCTAssertEqual(brandKit.tone, .competitive)
        XCTAssertEqual(brandKit.styleReference, "Bold gaming style")
        XCTAssertNil(brandKit.logoUrl)
        XCTAssertNil(brandKit.extractedFrom)
    }
    
    func testBrandKitDecodingWithLogoUrl() throws {
        let json = """
        {
            "id": "test-id",
            "user_id": "user-123",
            "name": "Test Brand",
            "is_active": false,
            "primary_colors": ["#FF5733"],
            "accent_colors": [],
            "fonts": {"headline": "Inter", "body": "Inter"},
            "logo_url": "https://example.com/logo.png",
            "tone": "professional",
            "style_reference": "",
            "extracted_from": "https://example.com",
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
        """.data(using: .utf8)!
        
        let brandKit = try decoder.decode(BrandKit.self, from: json)
        
        XCTAssertEqual(brandKit.logoUrl, "https://example.com/logo.png")
        XCTAssertEqual(brandKit.extractedFrom, "https://example.com")
        XCTAssertFalse(brandKit.isActive)
    }
    
    // MARK: - BrandKitCreate Encoding Tests
    
    func testBrandKitCreateEncoding() throws {
        let create = BrandKitCreate(
            name: "My Brand",
            primaryColors: ["#FF5733"],
            accentColors: [],
            fonts: BrandKitFonts(headline: "Inter", body: "Roboto"),
            tone: .professional,
            styleReference: "Clean and modern"
        )
        
        let data = try encoder.encode(create)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["name"] as? String, "My Brand")
        XCTAssertEqual(json["primary_colors"] as? [String], ["#FF5733"])
        XCTAssertEqual(json["accent_colors"] as? [String], [])
        XCTAssertEqual(json["tone"] as? String, "professional")
        XCTAssertEqual(json["style_reference"] as? String, "Clean and modern")
        
        let fonts = json["fonts"] as? [String: String]
        XCTAssertEqual(fonts?["headline"], "Inter")
        XCTAssertEqual(fonts?["body"], "Roboto")
    }
    
    func testBrandKitCreateWithDefaults() throws {
        let create = BrandKitCreate(
            name: "Simple Brand",
            primaryColors: ["#000000"],
            fonts: BrandKitFonts(headline: "Inter", body: "Inter")
        )
        
        XCTAssertEqual(create.name, "Simple Brand")
        XCTAssertEqual(create.primaryColors, ["#000000"])
        XCTAssertEqual(create.accentColors, [])
        XCTAssertEqual(create.tone, .professional)
        XCTAssertEqual(create.styleReference, "")
        XCTAssertNil(create.logoUrl)
    }
    
    // MARK: - BrandKitUpdate Encoding Tests
    
    func testBrandKitUpdateEncoding() throws {
        let update = BrandKitUpdate(
            name: "Updated Name",
            primaryColors: ["#FF0000", "#00FF00"],
            tone: .casual
        )
        
        let data = try encoder.encode(update)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["name"] as? String, "Updated Name")
        XCTAssertEqual(json["primary_colors"] as? [String], ["#FF0000", "#00FF00"])
        XCTAssertEqual(json["tone"] as? String, "casual")
    }
    
    func testBrandKitUpdatePartialEncoding() throws {
        let update = BrandKitUpdate(name: "Only Name")
        
        let data = try encoder.encode(update)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["name"] as? String, "Only Name")
        // Other fields should be null/nil
        XCTAssertTrue(json["primary_colors"] is NSNull || json["primary_colors"] == nil)
    }
    
    // MARK: - BrandKitTone Tests
    
    func testBrandKitToneAllCases() {
        let allTones = BrandKitTone.allCases
        
        XCTAssertEqual(allTones.count, 5)
        XCTAssertTrue(allTones.contains(.competitive))
        XCTAssertTrue(allTones.contains(.casual))
        XCTAssertTrue(allTones.contains(.educational))
        XCTAssertTrue(allTones.contains(.comedic))
        XCTAssertTrue(allTones.contains(.professional))
    }
    
    func testBrandKitToneRawValues() {
        XCTAssertEqual(BrandKitTone.competitive.rawValue, "competitive")
        XCTAssertEqual(BrandKitTone.casual.rawValue, "casual")
        XCTAssertEqual(BrandKitTone.educational.rawValue, "educational")
        XCTAssertEqual(BrandKitTone.comedic.rawValue, "comedic")
        XCTAssertEqual(BrandKitTone.professional.rawValue, "professional")
    }
    
    func testBrandKitToneDecoding() throws {
        for tone in BrandKitTone.allCases {
            let json = "\"\(tone.rawValue)\"".data(using: .utf8)!
            let decoded = try decoder.decode(BrandKitTone.self, from: json)
            XCTAssertEqual(decoded, tone)
        }
    }
    
    // MARK: - BrandKitFonts Tests
    
    func testBrandKitFontsEquality() {
        let fonts1 = BrandKitFonts(headline: "Inter", body: "Roboto")
        let fonts2 = BrandKitFonts(headline: "Inter", body: "Roboto")
        let fonts3 = BrandKitFonts(headline: "Montserrat", body: "Roboto")
        
        XCTAssertEqual(fonts1, fonts2)
        XCTAssertNotEqual(fonts1, fonts3)
    }
    
    func testBrandKitFontsDecoding() throws {
        let json = """
        {"headline": "Poppins", "body": "Open Sans"}
        """.data(using: .utf8)!
        
        let fonts = try decoder.decode(BrandKitFonts.self, from: json)
        
        XCTAssertEqual(fonts.headline, "Poppins")
        XCTAssertEqual(fonts.body, "Open Sans")
    }
    
    // MARK: - Supported Fonts Tests
    
    func testSupportedFontsCount() {
        XCTAssertEqual(supportedFonts.count, 20)
    }
    
    func testSupportedFontsContainsExpectedFonts() {
        XCTAssertTrue(supportedFonts.contains("Inter"))
        XCTAssertTrue(supportedFonts.contains("Montserrat"))
        XCTAssertTrue(supportedFonts.contains("Roboto"))
        XCTAssertTrue(supportedFonts.contains("Open Sans"))
        XCTAssertTrue(supportedFonts.contains("Poppins"))
        XCTAssertTrue(supportedFonts.contains("Playfair Display"))
    }
    
    // MARK: - BrandKitListResponse Tests
    
    func testBrandKitListResponseDecoding() throws {
        let json = """
        {
            "brand_kits": [],
            "total": 0,
            "active_id": null
        }
        """.data(using: .utf8)!
        
        let response = try decoder.decode(BrandKitListResponse.self, from: json)
        
        XCTAssertTrue(response.brandKits.isEmpty)
        XCTAssertEqual(response.total, 0)
        XCTAssertNil(response.activeId)
    }
    
    func testBrandKitListResponseWithBrandKits() throws {
        let json = """
        {
            "brand_kits": [
                {
                    "id": "kit-1",
                    "user_id": "user-123",
                    "name": "Brand 1",
                    "is_active": true,
                    "primary_colors": ["#FF5733"],
                    "accent_colors": [],
                    "fonts": {"headline": "Inter", "body": "Inter"},
                    "logo_url": null,
                    "tone": "professional",
                    "style_reference": "",
                    "extracted_from": null,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-15T10:30:00Z"
                }
            ],
            "total": 1,
            "active_id": "kit-1"
        }
        """.data(using: .utf8)!
        
        let response = try decoder.decode(BrandKitListResponse.self, from: json)
        
        XCTAssertEqual(response.brandKits.count, 1)
        XCTAssertEqual(response.total, 1)
        XCTAssertEqual(response.activeId, "kit-1")
        XCTAssertEqual(response.brandKits.first?.name, "Brand 1")
    }
    
    // MARK: - BrandKit Equality Tests
    
    func testBrandKitEquality() {
        let fonts = BrandKitFonts(headline: "Inter", body: "Inter")
        let date = Date()
        
        let kit1 = BrandKit(
            id: "test-id",
            userId: "user-id",
            name: "Test",
            primaryColors: ["#FF5733"],
            fonts: fonts,
            createdAt: date,
            updatedAt: date
        )
        
        let kit2 = BrandKit(
            id: "test-id",
            userId: "user-id",
            name: "Test",
            primaryColors: ["#FF5733"],
            fonts: fonts,
            createdAt: date,
            updatedAt: date
        )
        
        XCTAssertEqual(kit1, kit2)
    }
    
    func testBrandKitIdentifiable() {
        let fonts = BrandKitFonts(headline: "Inter", body: "Inter")
        let kit = BrandKit(
            id: "unique-id",
            userId: "user-id",
            name: "Test",
            primaryColors: ["#FF5733"],
            fonts: fonts
        )
        
        XCTAssertEqual(kit.id, "unique-id")
    }
    
    // MARK: - BrandKitError Tests
    
    func testBrandKitErrorDescriptions() {
        let loadError = BrandKitError.loadFailed("Network timeout")
        XCTAssertTrue(loadError.localizedDescription.contains("Failed to load"))
        XCTAssertTrue(loadError.localizedDescription.contains("Network timeout"))
        
        let createError = BrandKitError.createFailed("Invalid data")
        XCTAssertTrue(createError.localizedDescription.contains("Failed to create"))
        
        let notFoundError = BrandKitError.notFound
        XCTAssertEqual(notFoundError.localizedDescription, "Brand kit not found")
        
        let unauthorizedError = BrandKitError.unauthorized
        XCTAssertTrue(unauthorizedError.localizedDescription.contains("not authorized"))
    }
    
    func testBrandKitErrorEquality() {
        XCTAssertEqual(BrandKitError.notFound, BrandKitError.notFound)
        XCTAssertEqual(BrandKitError.unauthorized, BrandKitError.unauthorized)
        XCTAssertEqual(
            BrandKitError.loadFailed("error"),
            BrandKitError.loadFailed("error")
        )
        XCTAssertNotEqual(
            BrandKitError.loadFailed("error1"),
            BrandKitError.loadFailed("error2")
        )
    }
}

// MARK: - BrandKitViewModel Error State Tests

final class BrandKitViewModelErrorTests: XCTestCase {
    
    // MARK: - Test: Network Error on Load
    
    func testViewModelLoadBrandKitsNetworkError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Connection failed")
        mockService.simulatedDelay = 0 // No delay for tests
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        await viewModel.loadBrandKits()
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .networkError("Connection failed"))
        XCTAssertTrue(viewModel.brandKits.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Unauthorized Error on Load
    
    func testViewModelLoadBrandKitsUnauthorizedError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .unauthorized
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        await viewModel.loadBrandKits()
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .unauthorized)
        XCTAssertTrue(viewModel.brandKits.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Create Brand Kit Error
    
    func testViewModelCreateBrandKitError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .createFailed("Validation error")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        let createData = BrandKitCreate(
            name: "Test Brand",
            primaryColors: ["#FF5733"],
            fonts: BrandKitFonts(headline: "Inter", body: "Inter")
        )
        
        do {
            _ = try await viewModel.createBrandKit(createData)
            XCTFail("Expected createBrandKit to throw an error")
        } catch {
            // Expected error
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .createFailed("Validation error"))
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Update Brand Kit Error
    
    func testViewModelUpdateBrandKitError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .updateFailed("Update failed")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        let updateData = BrandKitUpdate(name: "Updated Name")
        
        do {
            _ = try await viewModel.updateBrandKit("test-id", data: updateData)
            XCTFail("Expected updateBrandKit to throw an error")
        } catch {
            // Expected error
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .updateFailed("Update failed"))
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Delete Brand Kit Error
    
    func testViewModelDeleteBrandKitError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .deleteFailed("Delete failed")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        do {
            try await viewModel.deleteBrandKit("test-id")
            XCTFail("Expected deleteBrandKit to throw an error")
        } catch {
            // Expected error
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .deleteFailed("Delete failed"))
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Activate Brand Kit Error
    
    func testViewModelActivateBrandKitError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .activateFailed("Activation failed")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        do {
            try await viewModel.activateBrandKit("test-id")
            XCTFail("Expected activateBrandKit to throw an error")
        } catch {
            // Expected error
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .activateFailed("Activation failed"))
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Clear Error
    
    func testViewModelClearError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Test error")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        // First, trigger an error
        await viewModel.loadBrandKits()
        XCTAssertNotNil(viewModel.error)
        
        // Now clear the error
        await viewModel.clearError()
        
        XCTAssertNil(viewModel.error)
    }
    
    // MARK: - Test: Error Preview Static Property
    
    func testViewModelErrorPreview() {
        let viewModel = BrandKitViewModel.errorPreview
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .loadFailed("Network connection failed"))
    }
    
    // MARK: - Test: Not Found Error
    
    func testViewModelNotFoundError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .notFound
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        let updateData = BrandKitUpdate(name: "Updated Name")
        
        do {
            _ = try await viewModel.updateBrandKit("non-existent-id", data: updateData)
            XCTFail("Expected updateBrandKit to throw a not found error")
        } catch let error as BrandKitError {
            XCTAssertEqual(error, .notFound)
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .notFound)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Error Recovery
    
    func testViewModelErrorRecovery() async {
        let mockService = MockBrandKitService()
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        // First, trigger an error
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Connection failed")
        
        await viewModel.loadBrandKits()
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .networkError("Connection failed"))
        XCTAssertTrue(viewModel.brandKits.isEmpty)
        
        // Now, simulate recovery - successful operation should clear the error
        mockService.shouldFail = false
        
        await viewModel.loadBrandKits()
        
        XCTAssertNil(viewModel.error, "Error should be cleared after successful operation")
        XCTAssertFalse(viewModel.brandKits.isEmpty, "Brand kits should be loaded after recovery")
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Test: Loading State During Error
    
    func testViewModelLoadingStateDuringError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Test error")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        // Verify initial state
        XCTAssertFalse(viewModel.isLoading)
        
        await viewModel.loadBrandKits()
        
        // After completion, loading should be false even with error
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
    }
    
    // MARK: - Test: Multiple Error Types
    
    func testViewModelDecodingError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .decodingError("Invalid JSON response")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        await viewModel.loadBrandKits()
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .decodingError("Invalid JSON response"))
    }
    
    // MARK: - Test: Error Does Not Affect Existing Data on Load Failure
    
    func testViewModelErrorPreservesExistingDataOnLoadFailure() async {
        let mockService = MockBrandKitService()
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        // First, load successfully
        await viewModel.loadBrandKits()
        
        XCTAssertFalse(viewModel.brandKits.isEmpty)
        let originalCount = viewModel.brandKits.count
        XCTAssertGreaterThan(originalCount, 0)
        
        // Now, trigger an error on reload
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Connection lost")
        
        await viewModel.loadBrandKits()
        
        // Error should be set
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .networkError("Connection lost"))
        
        // The current implementation preserves existing brandKits on load error
        // This is good UX - users can still see their data even if refresh fails
        XCTAssertEqual(viewModel.brandKits.count, originalCount, "Brand kits should be preserved on load error")
    }
    
    // MARK: - Test: Create Error with Network Error Type
    
    func testViewModelCreateBrandKitNetworkError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Server unreachable")
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        let createData = BrandKitCreate(
            name: "Test Brand",
            primaryColors: ["#FF5733"],
            fonts: BrandKitFonts(headline: "Inter", body: "Inter")
        )
        
        do {
            _ = try await viewModel.createBrandKit(createData)
            XCTFail("Expected createBrandKit to throw an error")
        } catch let error as BrandKitError {
            XCTAssertEqual(error, .networkError("Server unreachable"))
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .networkError("Server unreachable"))
    }
    
    // MARK: - Test: Activate Not Found Error
    
    func testViewModelActivateBrandKitNotFoundError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .notFound
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        do {
            try await viewModel.activateBrandKit("non-existent-id")
            XCTFail("Expected activateBrandKit to throw a not found error")
        } catch let error as BrandKitError {
            XCTAssertEqual(error, .notFound)
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .notFound)
    }
    
    // MARK: - Test: Delete Unauthorized Error
    
    func testViewModelDeleteBrandKitUnauthorizedError() async {
        let mockService = MockBrandKitService()
        mockService.shouldFail = true
        mockService.errorToThrow = .unauthorized
        mockService.simulatedDelay = 0
        
        let viewModel = BrandKitViewModel(service: mockService)
        
        do {
            try await viewModel.deleteBrandKit("test-id")
            XCTFail("Expected deleteBrandKit to throw an unauthorized error")
        } catch let error as BrandKitError {
            XCTAssertEqual(error, .unauthorized)
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
        
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, .unauthorized)
    }
}
