package online.vanhoang.kotobase;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();

                // Bật DOM Storage và Database cho IndexedDB hoạt động (offline data)
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                // Cho phép Service Worker cache phục vụ khi offline
                // LOAD_CACHE_ELSE_NETWORK: thử HTTP cache trước, nếu không có mới fetch mạng
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);

                // Cho phép JS và mixed content để SW hoạt động đúng
                settings.setJavaScriptEnabled(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
