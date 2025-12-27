//
//  StreamerStudioApp.swift
//  StreamerStudio
//
//  Main entry point for the Aurastream iOS application.
//

import SwiftUI
import StreamerStudioCore

/// The main application entry point for Aurastream.
///
/// This app provides a professional streaming studio experience
/// for content creators on iOS and macOS platforms.
@main
struct StreamerStudioApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

/// The root content view for the application.
struct ContentView: View {
    var body: some View {
        ZStack {
            Color(hex: Colors.Background.primary)
                .ignoresSafeArea()
            
            VStack(spacing: Spacing.scale4) {
                Text("Aurastream")
                    .font(.system(size: Typography.FontSize.xl2, weight: .semibold))
                    .foregroundColor(Color(hex: Colors.Text.primary))
                
                Text("Professional Streaming Made Simple")
                    .font(.system(size: Typography.FontSize.base))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
            }
        }
    }
}

#Preview {
    ContentView()
}
