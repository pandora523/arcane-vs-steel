import Foundation
import WebKit
import AVFoundation
import GameController
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

@MainActor
public final class NativePlatformBridge: NSObject, WKScriptMessageHandler {
    public static let messageHandlerName = "avsNative"

    public weak var webView: WKWebView?

    private var gamepadPollTimer: Timer?
    private var activeVirtualKeys: Set<String> = []
    private var prevButtonEdge: [String: Bool] = [:]
    private var isApplicationActive: Bool = true
    private var pendingAudioForceRebuild: Bool = false
    nonisolated(unsafe) private var observerTokens: [NSObjectProtocol] = []

    nonisolated private static let audioSessionQueue = DispatchQueue(
        label: "com.gabugabu.arcanevssteel.audiosession",
        qos: .userInitiated
    )

    #if os(iOS)
    private lazy var hapticLight = UIImpactFeedbackGenerator(style: .light)
    private lazy var hapticMedium = UIImpactFeedbackGenerator(style: .medium)
    private lazy var hapticHeavy = UIImpactFeedbackGenerator(style: .heavy)
    #endif

    public override init() {
        super.init()
        Self.activateAudioSessionAsync()
        configureLifecycleAndAudioSessionObservers()
        configureEventDrivenGamepadObservers()
        #if os(iOS)
        hapticLight.prepare()
        hapticMedium.prepare()
        #endif
    }

    deinit {
        for token in observerTokens {
            NotificationCenter.default.removeObserver(token)
        }
    }

    nonisolated private static func activateAudioSessionAsync(
        onComplete: (@MainActor @Sendable () -> Void)? = nil
    ) {
        #if os(iOS)
        audioSessionQueue.async {
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
                try session.setPreferredIOBufferDuration(0.010) // Thermal-balanced 10ms combat audio buffer
                try session.setActive(true)
            } catch {
                // Non-fatal in simulator
            }
            if let onComplete {
                Task { @MainActor in
                    onComplete()
                }
            }
        }
        #else
        if let onComplete {
            Task { @MainActor in
                onComplete()
            }
        }
        #endif
    }

    private func configureLifecycleAndAudioSessionObservers() {
        #if os(iOS)
        let center = NotificationCenter.default

        let interruptionToken = center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            Task { @MainActor in
                guard let self,
                      let rawType,
                      let type = AVAudioSession.InterruptionType(rawValue: rawType) else {
                    return
                }
                if type == .ended {
                    Self.activateAudioSessionAsync { [weak self] in
                        guard let self else { return }
                        if UIApplication.shared.applicationState != .background {
                            self.webView?.evaluateJavaScript(
                                "window.__avsSetAppActive && window.__avsSetAppActive(true); window.__avsResumeAudio && window.__avsResumeAudio(false);",
                                completionHandler: nil
                            )
                        }
                    }
                }
            }
        }
        observerTokens.append(interruptionToken)

        let mediaResetToken = center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                if UIApplication.shared.applicationState == .background {
                    self.pendingAudioForceRebuild = true
                }
                Self.activateAudioSessionAsync { [weak self] in
                    guard let self else { return }
                    if UIApplication.shared.applicationState == .background {
                        self.pendingAudioForceRebuild = true
                    } else {
                        self.pendingAudioForceRebuild = false
                        self.webView?.evaluateJavaScript(
                            "window.__avsSetAppActive && window.__avsSetAppActive(true); window.__avsResumeAudio && window.__avsResumeAudio(true);",
                            completionHandler: nil
                        )
                    }
                }
            }
        }
        observerTokens.append(mediaResetToken)

        let willEnterFgToken = center.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.setApplicationActive(true)
            }
        }
        observerTokens.append(willEnterFgToken)

        let didBecomeActiveToken = center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.setApplicationActive(true)
            }
        }
        observerTokens.append(didBecomeActiveToken)
        #endif
    }

    public func setApplicationActive(_ active: Bool) {
        if !active {
            guard isApplicationActive else { return }
            isApplicationActive = false
            syncGamepadTimerState()
            SanctumMetalPipeline.shared.setApplicationActive(false)
            // Keep host AVAudioSession untouched when backgrounding so WebKit's out-of-process
            // GPU/WebContent audio route stays valid on wake; JS AudioContext.suspend() drops background power to 0%.
            webView?.evaluateJavaScript(
                "window.__avsSetAppActive && window.__avsSetAppActive(false);",
                completionHandler: nil
            )
            return
        }

        isApplicationActive = true
        syncGamepadTimerState()
        SanctumMetalPipeline.shared.setApplicationActive(true)
        #if os(iOS)
        if webView?.isHidden == true {
            webView?.isHidden = false
        }
        hapticLight.prepare()
        hapticMedium.prepare()
        #endif
        let forceRebuild = pendingAudioForceRebuild
        pendingAudioForceRebuild = false
        let rebuildFlag = forceRebuild ? "true" : "false"
        Self.activateAudioSessionAsync { [weak self] in
            guard let self, self.isApplicationActive else { return }
            self.webView?.evaluateJavaScript(
                "window.__avsSetAppActive && window.__avsSetAppActive(true); window.__avsResumeAudio && window.__avsResumeAudio(\(rebuildFlag));",
                completionHandler: nil
            )
        }
    }

    // MARK: - WKScriptMessageHandler (`window.webkit.messageHandlers.avsNative.postMessage(...)`)

    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "stageReady":
            #if os(iOS)
            webView?.isOpaque = true
            webView?.backgroundColor = UIColor(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0, alpha: 1.0)
            #elseif os(macOS)
            webView?.setValue(true, forKey: "drawsBackground")
            #endif
            SanctumMetalPipeline.shared.markGameStageOpaqueReady()

        case "haptic":
            let style = (body["style"] as? String) ?? "light"
            triggerHaptic(style: style)

        case "toggleMacFullscreen":
            #if os(macOS)
            if let win = webView?.window ?? NSApplication.shared.keyWindow {
                win.toggleFullScreen(nil)
            }
            #endif

        case "fpsReport":
            var report = body
            report["metalDevice"] = SanctumMetalPipeline.shared.gpuSummary
            if let jsonData = try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted]),
               let jsonText = String(data: jsonData, encoding: .utf8) {
                try? jsonText.write(toFile: "/tmp/avs_fps_report.json", atomically: true, encoding: .utf8)
                print("[AVS-METAL-FPS] \(jsonText)")
            }

        default:
            break
        }
    }

    public func triggerHaptic(style: String) {
        #if os(iOS)
        switch style {
        case "heavy":
            hapticHeavy.impactOccurred()
            hapticHeavy.prepare()
        case "medium":
            hapticMedium.impactOccurred()
            hapticMedium.prepare()
        default:
            hapticLight.impactOccurred()
            hapticLight.prepare()
        }
        #endif
    }

    // MARK: - Event-Driven `GCController` Hardware Gamepad Bridge (0% CPU when no controller is paired)

    private func configureEventDrivenGamepadObservers() {
        NotificationCenter.default.addObserver(
            forName: .GCControllerDidConnect,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.syncGamepadTimerState()
            }
        }
        NotificationCenter.default.addObserver(
            forName: .GCControllerDidDisconnect,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.syncGamepadTimerState()
            }
        }
        syncGamepadTimerState()
    }

    private func syncGamepadTimerState() {
        let shouldPoll = isApplicationActive && !GCController.controllers().isEmpty
        if shouldPoll && gamepadPollTimer == nil {
            let timer = Timer(timeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
                MainActor.assumeIsolated {
                    self?.pollHardwareController()
                }
            }
            RunLoop.main.add(timer, forMode: .common)
            gamepadPollTimer = timer
        } else if !shouldPoll {
            gamepadPollTimer?.invalidate()
            gamepadPollTimer = nil
            if !activeVirtualKeys.isEmpty {
                for key in activeVirtualKeys {
                    dispatchKeyEvent(type: "keyup", key: key)
                }
                activeVirtualKeys.removeAll()
            }
        }
    }

    private func pollHardwareController() {
        guard let gp = GCController.current?.extendedGamepad ?? GCController.controllers().first?.extendedGamepad else {
            return
        }

        let stickX = gp.leftThumbstick.xAxis.value
        let stickY = gp.leftThumbstick.yAxis.value
        let dpadX = gp.dpad.xAxis.value
        let dpadY = gp.dpad.yAxis.value
        let mx = abs(dpadX) > 0.2 ? dpadX : stickX
        let my = abs(dpadY) > 0.2 ? dpadY : stickY

        var desired: Set<String> = []
        if mx < -0.28 { desired.insert("a") }
        if mx >  0.28 { desired.insert("d") }
        if my >  0.28 { desired.insert("w") }
        if my < -0.28 { desired.insert("s") }

        // Continuous / held combat keys (Adventure Mode actions: J=Attack, K=Skill, L=Dodge, U=Overdrive, I=Supreme)
        if gp.buttonA.isPressed { desired.insert("j") }
        if gp.buttonX.isPressed { desired.insert("k") }
        if gp.buttonB.isPressed { desired.insert("l") }
        if gp.buttonY.isPressed { desired.insert("u") }
        if gp.rightTrigger.isPressed || gp.rightShoulder.isPressed { desired.insert("i") }

        for key in desired.subtracting(activeVirtualKeys) {
            dispatchKeyEvent(type: "keydown", key: key)
        }
        for key in activeVirtualKeys.subtracting(desired) {
            dispatchKeyEvent(type: "keyup", key: key)
        }
        activeVirtualKeys = desired

        // Edge-triggered utility keys (Pause = Esc, Skill Tree = T, Auto = P)
        handleEdgeKey("menu", pressed: gp.buttonMenu.isPressed, key: "Escape")
        handleEdgeKey("options", pressed: gp.buttonOptions?.isPressed ?? false, key: "t")
        handleEdgeKey("l1", pressed: gp.leftShoulder.isPressed, key: "p")
    }

    private func handleEdgeKey(_ id: String, pressed: Bool, key: String) {
        let wasPressed = prevButtonEdge[id] ?? false
        prevButtonEdge[id] = pressed
        if pressed && !wasPressed {
            dispatchKeyEvent(type: "keydown", key: key)
            dispatchKeyEvent(type: "keyup", key: key)
        }
    }

    private func dispatchKeyEvent(type: String, key: String) {
        guard let webView else { return }
        let codeMap: [String: String] = [
            "w": "KeyW", "a": "KeyA", "s": "KeyS", "d": "KeyD",
            "j": "KeyJ", "k": "KeyK", "l": "KeyL", "u": "KeyU", "i": "KeyI",
            "p": "KeyP", "t": "KeyT", "Escape": "Escape"
        ]
        let code = codeMap[key] ?? key
        let js = """
        window.dispatchEvent(new KeyboardEvent('\(type)', { key: '\(key)', code: '\(code)', bubbles: true, cancelable: true }));
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
