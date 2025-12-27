//
//  GenerationTests.swift
//  StreamerStudioTests
//
//  Unit tests for Generation feature models, ViewModel, and services.
//

import XCTest
@testable import StreamerStudioCore
@testable import StreamerStudioLib

// MARK: - Generation Model Tests

final class GenerationModelTests: XCTestCase {
    
    private var decoder: JSONDecoder!
    private var encoder: JSONEncoder!
    
    override func setUp() {
        super.setUp()
        decoder = JSONDecoder()
        // decoder handles snake_case via CodingKeys
        decoder.dateDecodingStrategy = .iso8601
        encoder = JSONEncoder()
        // encoder handles snake_case via CodingKeys
    }
    
    override func tearDown() {
        decoder = nil
        encoder = nil
        super.tearDown()
    }
    
    func testAssetTypeDisplayNames() {
        XCTAssertEqual(AssetType.thumbnail.displayName, "Thumbnail")
        XCTAssertEqual(AssetType.overlay.displayName, "Overlay")
        XCTAssertEqual(AssetType.banner.displayName, "Banner")
        XCTAssertEqual(AssetType.storyGraphic.displayName, "Story Graphic")
        XCTAssertEqual(AssetType.clipCover.displayName, "Clip Cover")
    }

    func testAssetTypeAllCases() {
        let allTypes = AssetType.allCases
        XCTAssertEqual(allTypes.count, 5)
        XCTAssertTrue(allTypes.contains(AssetType.thumbnail))
        XCTAssertTrue(allTypes.contains(AssetType.overlay))
        XCTAssertTrue(allTypes.contains(AssetType.banner))
        XCTAssertTrue(allTypes.contains(AssetType.storyGraphic))
        XCTAssertTrue(allTypes.contains(AssetType.clipCover))
    }
    
    func testAssetTypeDimensions() {
        XCTAssertEqual(AssetType.thumbnail.dimensions.width, 1280)
        XCTAssertEqual(AssetType.thumbnail.dimensions.height, 720)
        XCTAssertEqual(AssetType.overlay.dimensions.width, 1920)
        XCTAssertEqual(AssetType.overlay.dimensions.height, 1080)
        XCTAssertEqual(AssetType.banner.dimensions.width, 1200)
        XCTAssertEqual(AssetType.banner.dimensions.height, 480)
        XCTAssertEqual(AssetType.storyGraphic.dimensions.width, 1080)
        XCTAssertEqual(AssetType.storyGraphic.dimensions.height, 1920)
        XCTAssertEqual(AssetType.clipCover.dimensions.width, 1080)
        XCTAssertEqual(AssetType.clipCover.dimensions.height, 1080)
    }
    
    func testAssetTypeRawValues() {
        XCTAssertEqual(AssetType.thumbnail.rawValue, "thumbnail")
        XCTAssertEqual(AssetType.overlay.rawValue, "overlay")
        XCTAssertEqual(AssetType.banner.rawValue, "banner")
        XCTAssertEqual(AssetType.storyGraphic.rawValue, "story_graphic")
        XCTAssertEqual(AssetType.clipCover.rawValue, "clip_cover")
    }

    func testJobStatusAllCases() {
        let allStatuses = JobStatus.allCases
        XCTAssertEqual(allStatuses.count, 5)
        XCTAssertTrue(allStatuses.contains(JobStatus.queued))
        XCTAssertTrue(allStatuses.contains(JobStatus.processing))
        XCTAssertTrue(allStatuses.contains(JobStatus.completed))
        XCTAssertTrue(allStatuses.contains(JobStatus.failed))
        XCTAssertTrue(allStatuses.contains(JobStatus.partial))
    }
    
    func testJobStatusRawValues() {
        XCTAssertEqual(JobStatus.queued.rawValue, "queued")
        XCTAssertEqual(JobStatus.processing.rawValue, "processing")
        XCTAssertEqual(JobStatus.completed.rawValue, "completed")
        XCTAssertEqual(JobStatus.failed.rawValue, "failed")
        XCTAssertEqual(JobStatus.partial.rawValue, "partial")
    }
    
    func testJobStatusIsFinished() {
        XCTAssertTrue(JobStatus.completed.isFinished)
        XCTAssertTrue(JobStatus.failed.isFinished)
        XCTAssertTrue(JobStatus.partial.isFinished)
        XCTAssertFalse(JobStatus.queued.isFinished)
        XCTAssertFalse(JobStatus.processing.isFinished)
    }
    
    func testJobStatusIsInProgress() {
        XCTAssertTrue(JobStatus.queued.isInProgress)
        XCTAssertTrue(JobStatus.processing.isInProgress)
        XCTAssertFalse(JobStatus.completed.isInProgress)
        XCTAssertFalse(JobStatus.failed.isInProgress)
        XCTAssertFalse(JobStatus.partial.isInProgress)
    }

    func testGenerationJobDecoding() throws {
        let json = """
        {
            "id": "job-123",
            "user_id": "user-456",
            "brand_kit_id": "brand-789",
            "asset_type": "thumbnail",
            "status": "completed",
            "progress": 100,
            "error_message": null,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:32:00Z",
            "completed_at": "2024-01-15T10:32:00Z"
        }
        """.data(using: .utf8)!
        
        let job = try decoder.decode(GenerationJob.self, from: json)
        
        XCTAssertEqual(job.id, "job-123")
        XCTAssertEqual(job.userId, "user-456")
        XCTAssertEqual(job.brandKitId, "brand-789")
        XCTAssertEqual(job.assetType, AssetType.thumbnail)
        XCTAssertEqual(job.status, JobStatus.completed)
        XCTAssertEqual(job.progress, 100)
        XCTAssertNil(job.errorMessage)
        XCTAssertNotNil(job.completedAt)
    }

    func testAssetDecoding() throws {
        let json = """
        {
            "id": "asset-123",
            "job_id": "job-456",
            "user_id": "user-789",
            "asset_type": "thumbnail",
            "url": "https://storage.example.com/assets/asset-123.png",
            "width": 1280,
            "height": 720,
            "file_size": 524288,
            "is_public": true,
            "viral_score": 85,
            "created_at": "2024-01-15T10:32:00Z"
        }
        """.data(using: .utf8)!
        
        let asset = try decoder.decode(Asset.self, from: json)
        
        XCTAssertEqual(asset.id, "asset-123")
        XCTAssertEqual(asset.jobId, "job-456")
        XCTAssertEqual(asset.assetType, AssetType.thumbnail)
        XCTAssertEqual(asset.width, 1280)
        XCTAssertEqual(asset.height, 720)
        XCTAssertTrue(asset.isPublic)
        XCTAssertEqual(asset.viralScore, 85)
    }

    func testGenerateRequestEncoding() throws {
        let request = GenerateRequest(
            assetType: .thumbnail,
            brandKitId: "brand-kit-123",
            customPrompt: "Epic gaming moment"
        )
        
        let data = try encoder.encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["asset_type"] as? String, "thumbnail")
        XCTAssertEqual(json["brand_kit_id"] as? String, "brand-kit-123")
        XCTAssertEqual(json["custom_prompt"] as? String, "Epic gaming moment")
    }
    
    func testGenerationErrorEquality() {
        XCTAssertEqual(GenerationError.jobNotFound, GenerationError.jobNotFound)
        XCTAssertEqual(GenerationError.unauthorized, GenerationError.unauthorized)
        XCTAssertEqual(
            GenerationError.createJobFailed("error"),
            GenerationError.createJobFailed("error")
        )
        XCTAssertNotEqual(
            GenerationError.createJobFailed("error1"),
            GenerationError.createJobFailed("error2")
        )
    }
}

final class GenerationViewModelTests: XCTestCase {
    
    func testViewModelInitialState() {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        XCTAssertTrue(viewModel.jobs.isEmpty)
        XCTAssertTrue(viewModel.assets.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertNil(viewModel.currentJob)
    }
    
    func testCreateJobSuccess() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        do {
            let job = try await viewModel.createJob(
                assetType: .thumbnail,
                brandKitId: "brand-kit-123",
                customPrompt: "Test prompt"
            )
            
            XCTAssertNotNil(job)
            XCTAssertEqual(job.assetType, AssetType.thumbnail)
            XCTAssertEqual(job.brandKitId, "brand-kit-123")
            XCTAssertNil(viewModel.error)
        } catch {
            XCTFail("Expected createJob to succeed, but got error: \(error)")
        }
    }
    
    func testLoadJobsSuccess() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        await viewModel.loadJobs()
        
        XCTAssertFalse(viewModel.jobs.isEmpty)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testLoadAssetsSuccess() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        await viewModel.loadAssets()
        
        XCTAssertFalse(viewModel.assets.isEmpty)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testDeleteAssetSuccess() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        await viewModel.loadAssets()
        let initialCount = viewModel.assets.count
        XCTAssertGreaterThan(initialCount, 0)
        
        guard let assetId = viewModel.assets.first?.id else {
            XCTFail("No assets to delete")
            return
        }
        
        do {
            try await viewModel.deleteAsset(assetId)
            XCTAssertEqual(viewModel.assets.count, initialCount - 1)
            XCTAssertNil(viewModel.error)
        } catch {
            XCTFail("Expected deleteAsset to succeed, but got error: \(error)")
        }
    }

    func testToggleAssetVisibility() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        await viewModel.loadAssets()
        
        guard let asset = viewModel.assets.first else {
            XCTFail("No assets to toggle visibility")
            return
        }
        
        let originalVisibility = asset.isPublic
        
        do {
            try await viewModel.toggleAssetVisibility(asset)
            
            if let updatedAsset = viewModel.assets.first(where: { $0.id == asset.id }) {
                XCTAssertEqual(updatedAsset.isPublic, !originalVisibility)
            }
            XCTAssertNil(viewModel.error)
        } catch {
            XCTFail("Expected toggleAssetVisibility to succeed, but got error: \(error)")
        }
    }
    
    func testClearError() async {
        let mockService = MockGenerationService()
        mockService.shouldFail = true
        mockService.errorToThrow = .networkError("Test error")
        mockService.simulatedDelay = 0
        
        let viewModel = GenerationViewModel(service: mockService)
        
        await viewModel.loadJobs()
        XCTAssertNotNil(viewModel.error)
        
        await viewModel.clearError()
        XCTAssertNil(viewModel.error)
    }
}

final class MockGenerationServiceTests: XCTestCase {
    
    func testMockServiceCreateJob() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let request = GenerateRequest(
            assetType: .banner,
            brandKitId: "brand-kit-test",
            customPrompt: "Test banner"
        )
        
        do {
            let job = try await mockService.createJob(request)
            
            XCTAssertFalse(job.id.isEmpty)
            XCTAssertEqual(job.assetType, AssetType.banner)
            XCTAssertEqual(job.brandKitId, "brand-kit-test")
        } catch {
            XCTFail("Expected createJob to succeed: \(error)")
        }
    }
    
    func testMockServiceListJobs() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        do {
            let response = try await mockService.listJobs(status: nil, limit: nil, offset: nil)
            
            XCTAssertFalse(response.jobs.isEmpty)
            XCTAssertEqual(response.total, response.jobs.count)
        } catch {
            XCTFail("Expected listJobs to succeed: \(error)")
        }
    }
    
    func testMockServiceListAssets() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        do {
            let response = try await mockService.listAssets(assetType: nil, limit: nil, offset: nil)
            
            XCTAssertFalse(response.assets.isEmpty)
            XCTAssertEqual(response.total, response.assets.count)
        } catch {
            XCTFail("Expected listAssets to succeed: \(error)")
        }
    }
    
    func testMockServiceDeleteAsset() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let initialResponse = try? await mockService.listAssets(assetType: nil, limit: nil, offset: nil)
        let initialCount = initialResponse?.assets.count ?? 0
        
        guard let assetId = initialResponse?.assets.first?.id else {
            XCTFail("No assets to delete")
            return
        }
        
        do {
            try await mockService.deleteAsset(assetId)
            
            let afterResponse = try await mockService.listAssets(assetType: nil, limit: nil, offset: nil)
            XCTAssertEqual(afterResponse.assets.count, initialCount - 1)
        } catch {
            XCTFail("Expected deleteAsset to succeed: \(error)")
        }
    }
    
    func testMockServiceUpdateVisibility() async {
        let mockService = MockGenerationService()
        mockService.simulatedDelay = 0
        
        let assetsResponse = try? await mockService.listAssets(assetType: nil, limit: nil, offset: nil)
        guard let asset = assetsResponse?.assets.first else {
            XCTFail("No assets to update")
            return
        }
        
        let originalVisibility = asset.isPublic
        
        do {
            let updatedAsset = try await mockService.updateAssetVisibility(
                asset.id,
                isPublic: !originalVisibility
            )
            
            XCTAssertEqual(updatedAsset.id, asset.id)
            XCTAssertEqual(updatedAsset.isPublic, !originalVisibility)
        } catch {
            XCTFail("Expected updateAssetVisibility to succeed: \(error)")
        }
    }
}
