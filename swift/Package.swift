// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "StreamerStudio",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "StreamerStudioCore",
            targets: ["StreamerStudioCore"]
        ),
        .library(
            name: "StreamerStudioLib",
            targets: ["StreamerStudioLib"]
        ),
        .executable(
            name: "StreamerStudio",
            targets: ["StreamerStudio"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/typelift/SwiftCheck.git", from: "0.12.0")
    ],
    targets: [
        // Core library with design tokens and shared code (testable)
        .target(
            name: "StreamerStudioCore",
            dependencies: [],
            path: "Sources/StreamerStudioCore"
        ),
        // Library target containing ViewModels and Services (testable)
        .target(
            name: "StreamerStudioLib",
            dependencies: ["StreamerStudioCore"],
            path: "Sources/StreamerStudio",
            exclude: ["StreamerStudioApp.swift"]
        ),
        // Main app executable (not testable directly)
        .executableTarget(
            name: "StreamerStudio",
            dependencies: ["StreamerStudioCore", "StreamerStudioLib"],
            path: "Sources/StreamerStudio",
            sources: ["StreamerStudioApp.swift"]
        ),
        // Tests for the core library and StreamerStudioLib
        .testTarget(
            name: "StreamerStudioTests",
            dependencies: [
                "StreamerStudioCore",
                "StreamerStudioLib",
                "SwiftCheck"
            ],
            path: "Tests/StreamerStudioTests"
        ),
    ]
)
