import UIKit
import Capacitor
import WebKit

class MainViewController: CAPBridgeViewController {
    private var hasAttemptedOfflineFallback = false

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let nsError = error as NSError
        
        let isNetworkError = nsError.domain == NSURLErrorDomain && (
            nsError.code == NSURLErrorNotConnectedToInternet ||
            nsError.code == NSURLErrorCannotFindHost ||
            nsError.code == NSURLErrorTimedOut ||
            nsError.code == NSURLErrorNetworkConnectionLost
        )

        if !hasAttemptedOfflineFallback && isNetworkError {
            hasAttemptedOfflineFallback = true
            if let targetUrl = webView.url ?? URL(string: "https://kotobase.vanhoang.online") {
                let cacheRequest = URLRequest(url: targetUrl, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)
                webView.load(cacheRequest)
                return
            }
        }

        super.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    override func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        hasAttemptedOfflineFallback = false
        super.webView(webView, didFinish: navigation)
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
