import SwiftUI

@main
struct EliteOlympiadApp: App {
    var body: some Scene {
        WindowGroup {
            WebContentView()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}
