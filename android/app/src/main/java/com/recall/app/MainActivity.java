package com.recall.app;

import android.app.Dialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private Dialog popupDialog;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Force hardware acceleration for smooth 90Hz/120Hz displays
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings settings = webView.getSettings();
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setEnableSmoothTransition(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);

            // Strip WebView markers ("; wv" and "Version/X.X") to prevent Google OAuth 403 disallowed_useragent block
            String defaultUa = settings.getUserAgentString();
            final String cleanUa = (defaultUa != null)
                ? defaultUa.replace("; wv", "").replaceAll("Version\\/[0-9.]+\\s", "")
                : "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
            settings.setUserAgentString(cleanUa);

            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

            // Set custom BridgeWebChromeClient that handles OAuth window popups within the app context
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    if (popupDialog != null && popupDialog.isShowing()) {
                        try {
                            popupDialog.dismiss();
                        } catch (Exception ignored) {}
                    }

                    WebView popupWebView = new WebView(MainActivity.this);
                    popupWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setDatabaseEnabled(true);
                    popupSettings.setUserAgentString(cleanUa);

                    CookieManager.getInstance().setAcceptCookie(true);
                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                    popupDialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                    popupDialog.setContentView(popupWebView, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));
                    popupDialog.setCancelable(true);

                    popupDialog.setOnDismissListener(dialogInterface -> {
                        try {
                            popupWebView.destroy();
                        } catch (Exception ignored) {}
                    });

                    popupWebView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                        @Override
                        public void onCloseWindow(WebView window) {
                            if (popupDialog != null && popupDialog.isShowing()) {
                                try {
                                    popupDialog.dismiss();
                                } catch (Exception ignored) {}
                            }
                        }
                    });

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            Uri uri = request.getUrl();
                            String host = uri != null ? uri.getHost() : null;
                            // Keep Google auth and localhost flows inside this popup webview
                            if (host != null && (host.contains("google.com") || host.contains("localhost") || host.contains("googleusercontent.com") || host.contains("gstatic.com"))) {
                                return false;
                            }
                            // External links open in browser
                            if (uri != null) {
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                                    startActivity(intent);
                                    if (popupDialog != null && popupDialog.isShowing()) {
                                        popupDialog.dismiss();
                                    }
                                    return true;
                                } catch (Exception ignored) {}
                            }
                            return false;
                        }
                    });

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();

                    popupDialog.show();
                    return true;
                }

                @Override
                public void onCloseWindow(WebView window) {
                    if (popupDialog != null && popupDialog.isShowing()) {
                        try {
                            popupDialog.dismiss();
                        } catch (Exception ignored) {}
                    }
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (popupDialog != null && popupDialog.isShowing()) {
            try {
                popupDialog.dismiss();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
