//
//  JobProgressView.swift
//  StreamerStudio
//
//  View for displaying generation job progress.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Job Progress View

/// View for displaying the progress of a generation job.
///
/// This view provides:
/// - Real-time status updates via polling
/// - Progress indicator with percentage
/// - Animated processing state
/// - Error display with retry option
/// - Success state with link to asset
///
/// Usage:
/// ```swift
/// JobProgressView(
///     viewModel: generationViewModel,
///     job: currentJob
/// ) {
///     // On completion
/// }
/// ```
public struct JobProgressView: View {
    
    // MARK: - Properties
    
    @Bindable var viewModel: GenerationViewModel
    let job: GenerationJob
    let onComplete: () -> Void
    
    // MARK: - Environment
    
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    
    @State private var animationPhase: CGFloat = 0
    
    // MARK: - Computed Properties
    
    private var currentJob: GenerationJob {
        viewModel.currentJob ?? job
    }
    
    private var statusColor: Color {
        switch currentJob.status {
        case .queued:
            return .orange
        case .processing:
            return .blue
        case .completed:
            return .green
        case .failed:
            return .red
        case .partial:
            return .yellow
        }
    }
    
    // MARK: - Initialization
    
    public init(
        viewModel: GenerationViewModel,
        job: GenerationJob,
        onComplete: @escaping () -> Void
    ) {
        self.viewModel = viewModel
        self.job = job
        self.onComplete = onComplete
    }
    
    // MARK: - Body
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()
                
                statusIcon
                statusText
                progressIndicator
                
                Spacer()
                
                actionButtons
            }
            .padding(24)
            .navigationTitle("Generating Asset")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if currentJob.status.isInProgress {
                        Button("Cancel") {
                            viewModel.stopPolling()
                            dismiss()
                        }
                    }
                }
            }
            .onAppear {
                startAnimationIfNeeded()
            }
            .onChange(of: currentJob.status) { _, newStatus in
                if newStatus.isFinished {
                    stopAnimation()
                }
            }
        }
    }
    
    // MARK: - View Components
    
    private var statusIcon: some View {
        ZStack {
            // Background circle
            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 120, height: 120)
            
            // Animated ring for processing
            if currentJob.status.isInProgress {
                Circle()
                    .trim(from: 0, to: 0.7)
                    .stroke(
                        statusColor,
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .frame(width: 100, height: 100)
                    .rotationEffect(.degrees(animationPhase))
            }
            
            // Status icon
            Image(systemName: currentJob.status.iconName)
                .font(.system(size: 44))
                .foregroundColor(statusColor)
                .symbolEffect(.pulse, options: .repeating, isActive: currentJob.status.isInProgress)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(currentJob.status.displayName)")
    }
    
    private var statusText: some View {
        VStack(spacing: 8) {
            Text(statusTitle)
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(statusSubtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            if let errorMessage = currentJob.errorMessage, currentJob.status == .failed {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.top, 4)
                    .multilineTextAlignment(.center)
            }
        }
        .accessibilityElement(children: .combine)
    }
    
    private var statusTitle: String {
        switch currentJob.status {
        case .queued:
            return "Queued"
        case .processing:
            return "Generating..."
        case .completed:
            return "Complete!"
        case .failed:
            return "Generation Failed"
        case .partial:
            return "Partially Complete"
        }
    }
    
    private var statusSubtitle: String {
        switch currentJob.status {
        case .queued:
            return "Your \(currentJob.assetType.displayName.lowercased()) is in the queue"
        case .processing:
            return "Creating your \(currentJob.assetType.displayName.lowercased())"
        case .completed:
            return "Your \(currentJob.assetType.displayName.lowercased()) is ready"
        case .failed:
            return "Something went wrong during generation"
        case .partial:
            return "Some assets were generated successfully"
        }
    }
    
    private var progressIndicator: some View {
        VStack(spacing: 12) {
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                    
                    // Progress fill
                    RoundedRectangle(cornerRadius: 8)
                        .fill(statusColor)
                        .frame(width: geometry.size.width * CGFloat(currentJob.progress) / 100)
                        .animation(.easeInOut(duration: 0.3), value: currentJob.progress)
                }
            }
            .frame(height: 8)
            
            // Progress percentage
            Text("\(currentJob.progress)%")
                .font(.headline)
                .foregroundColor(statusColor)
                .monospacedDigit()
            
            // Asset type info
            HStack(spacing: 16) {
                Label(currentJob.assetType.displayName, systemImage: currentJob.assetType.iconName)
                Label(currentJob.assetType.aspectRatioDescription, systemImage: "aspectratio")
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.horizontal, 32)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Progress: \(currentJob.progress) percent")
    }
    
    @ViewBuilder
    private var actionButtons: some View {
        switch currentJob.status {
        case .completed:
            VStack(spacing: 12) {
                Button {
                    onComplete()
                } label: {
                    Label("View Asset", systemImage: "photo")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                
                Button {
                    dismiss()
                } label: {
                    Text("Generate Another")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
            }
            
        case .failed:
            VStack(spacing: 12) {
                Button {
                    Task {
                        await retryGeneration()
                    }
                } label: {
                    Label("Try Again", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
            }
            
        case .partial:
            VStack(spacing: 12) {
                Button {
                    onComplete()
                } label: {
                    Label("View Assets", systemImage: "photo.stack")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
            }
            
        default:
            // Show estimated time for in-progress jobs
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "clock")
                    Text("Estimated time: 30-60 seconds")
                }
                .font(.caption)
                .foregroundColor(.secondary)
                
                Text("You can close this and check back later")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Actions
    
    private func startAnimationIfNeeded() {
        guard currentJob.status.isInProgress else { return }
        
        withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
            animationPhase = 360
        }
    }
    
    private func stopAnimation() {
        withAnimation(.easeOut(duration: 0.3)) {
            animationPhase = 0
        }
    }
    
    private func retryGeneration() async {
        // Re-create the job with the same parameters
        do {
            _ = try await viewModel.createJob(
                assetType: currentJob.assetType,
                brandKitId: currentJob.brandKitId
            )
        } catch {
            // Error handled by viewModel
        }
    }
}

// MARK: - Compact Job Progress Row

/// Compact row view for showing job progress in a list.
public struct JobProgressRow: View {
    let job: GenerationJob
    
    public init(job: GenerationJob) {
        self.job = job
    }
    
    public var body: some View {
        HStack(spacing: 12) {
            // Status icon
            Image(systemName: job.status.iconName)
                .font(.title3)
                .foregroundColor(statusColor)
                .frame(width: 32)
            
            // Job info
            VStack(alignment: .leading, spacing: 4) {
                Text(job.assetType.displayName)
                    .font(.headline)
                
                HStack(spacing: 8) {
                    Text(job.status.displayName)
                        .font(.caption)
                        .foregroundColor(statusColor)
                    
                    if job.status.isInProgress {
                        Text("•")
                            .foregroundColor(.secondary)
                        Text("\(job.progress)%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .monospacedDigit()
                    }
                }
            }
            
            Spacer()
            
            // Progress indicator for in-progress jobs
            if job.status.isInProgress {
                ProgressView(value: Double(job.progress), total: 100)
                    .progressViewStyle(.circular)
                    .scaleEffect(0.8)
            }
            
            // Timestamp
            Text(job.createdAt, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(job.assetType.displayName), \(job.status.displayName), \(job.progress) percent complete")
    }
    
    private var statusColor: Color {
        switch job.status {
        case .queued:
            return .orange
        case .processing:
            return .blue
        case .completed:
            return .green
        case .failed:
            return .red
        case .partial:
            return .yellow
        }
    }
}

// MARK: - Preview

#Preview("Job Progress - Processing") {
    let mockService = MockGenerationService()
    let viewModel = GenerationViewModel(service: mockService)
    let job = GenerationJob(
        id: "preview-job",
        userId: "user-id",
        brandKitId: "brand-kit-id",
        assetType: .thumbnail,
        status: .processing,
        progress: 45
    )
    
    return JobProgressView(viewModel: viewModel, job: job) {
        print("Completed")
    }
}

#Preview("Job Progress - Completed") {
    let mockService = MockGenerationService()
    let viewModel = GenerationViewModel(service: mockService)
    let job = GenerationJob(
        id: "preview-job",
        userId: "user-id",
        brandKitId: "brand-kit-id",
        assetType: .thumbnail,
        status: .completed,
        progress: 100,
        completedAt: Date()
    )
    
    return JobProgressView(viewModel: viewModel, job: job) {
        print("Completed")
    }
}

#Preview("Job Progress - Failed") {
    let mockService = MockGenerationService()
    let viewModel = GenerationViewModel(service: mockService)
    let job = GenerationJob(
        id: "preview-job",
        userId: "user-id",
        brandKitId: "brand-kit-id",
        assetType: .banner,
        status: .failed,
        progress: 30,
        errorMessage: "AI service temporarily unavailable. Please try again."
    )
    
    return JobProgressView(viewModel: viewModel, job: job) {
        print("Completed")
    }
}

#Preview("Job Progress Row") {
    List {
        JobProgressRow(job: GenerationJob(
            id: "1",
            userId: "user",
            brandKitId: "kit",
            assetType: .thumbnail,
            status: .processing,
            progress: 65
        ))
        
        JobProgressRow(job: GenerationJob(
            id: "2",
            userId: "user",
            brandKitId: "kit",
            assetType: .banner,
            status: .completed,
            progress: 100
        ))
        
        JobProgressRow(job: GenerationJob(
            id: "3",
            userId: "user",
            brandKitId: "kit",
            assetType: .overlay,
            status: .failed,
            progress: 20
        ))
    }
}
