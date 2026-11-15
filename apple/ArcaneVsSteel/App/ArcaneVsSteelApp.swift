import SwiftUI

@main
public struct ArcaneVsSteelApp: App {
    @Environment(\.scenePhase) private var scenePhase

    public init() {
        _ = LocalSanctumServer.shared.ensureStarted()
    }

    public var body: some Scene {
        WindowGroup("Arcane vs. Steel") {
            ZStack {
                Color(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0)
                    .ignoresSafeArea()
                SanctumWebStageView(scenePhase: scenePhase)
                    .ignoresSafeArea()
            }
            .preferredColorScheme(.dark)
            #if os(iOS)
            .statusBarHidden(true)
            .persistentSystemOverlays(.hidden)
            #elseif os(macOS)
            .frame(minWidth: 960, minHeight: 600)
            #endif
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 760)
        #endif
    }
}
