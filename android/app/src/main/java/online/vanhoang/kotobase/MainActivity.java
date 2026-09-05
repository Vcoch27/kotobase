package online.vanhoang.kotobase;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.content.Context;
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
                settings.setJavaScriptEnabled(true);

                // Kiểm tra kết nối mạng
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
                boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();

                // Nếu mất mạng, ép WebView đọc từ Cache (bao gồm cả Service Worker cache)
                if (isConnected) {
                    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                } else {
                    settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
