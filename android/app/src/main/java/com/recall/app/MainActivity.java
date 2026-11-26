package com.recall.app;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebView popupWebView;

    @SuppressLint("SetJavaScriptEnabled")
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

            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        Uri parsedUri = Uri.parse(url);
                        String customName = parsedUri.getQueryParameter("filename");
                        String filename;
                        if (customName != null && !customName.trim().isEmpty()) {
                            filename = customName.trim();
                            if (!filename.contains(".")) {
                                filename += (mimetype != null && mimetype.contains("png")) ? ".png" : ".jpg";
                            }
                        } else {
                            filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                        }

                        DownloadManager.Request request = new DownloadManager.Request(parsedUri);
                        if (mimetype != null && !mimetype.isEmpty()) {
                            request.setMimeType(mimetype);
                        }
                        String cookies = CookieManager.getInstance().getCookie(url);
                        if (cookies != null) {
                            request.addRequestHeader("cookie", cookies);
                        }
                        request.addRequestHeader("User-Agent", userAgent);
                        request.setDescription("Downloading " + filename);
                        request.setTitle(filename);
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                        }
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    }
                }
            });

            final WebChromeClient defaultClient = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                ? webView.getWebChromeClient() 
                : null;

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    try {
                        closePopupWebView();

                        popupWebView = new WebView(MainActivity.this);
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

                        popupWebView.setWebChromeClient(new WebChromeClient() {
                            @Override
                            public void onCloseWindow(WebView window) {
                                closePopupWebView();
                            }
                        });

                        popupWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                                Uri uri = request.getUrl();
                                if (uri == null) return false;
                                String scheme = uri.getScheme();
                                String url = uri.toString();

                                // 1. UPI Payment Intent Interception (GPay, PhonePe, Paytm, CRED)
                                if ("upi".equalsIgnoreCase(scheme) || "credpay".equalsIgnoreCase(scheme) || url.startsWith("intent://")) {
                                    try {
                                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                                        startActivity(intent);
                                        return true;
                                    } catch (Exception e) {
                                        return true;
                                    }
                                }

                                // 2. Allow Google Auth & Razorpay / Banking 3DS ACS pages to complete in-window
                                String host = uri.getHost();
                                if (host != null && (
                                    host.contains("google.com") ||
                                    host.contains("accounts.google") ||
                                    host.contains("googleusercontent.com") ||
                                    host.contains("gstatic.com") ||
                                    host.contains("razorpay.com") ||
                                    host.contains("billdesk.com") ||
                                    host.contains("payu.in") ||
                                    host.contains("cashfree.com") ||
                                    host.contains("juspay.in") ||
                                    host.contains("npci.org.in") ||
                                    host.contains("localhost")
                                )) {
                                    return false;
                                }

                                // 3. Fallback for external links
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                                    startActivity(intent);
                                    closePopupWebView();
                                    return true;
                                } catch (Exception ignored) {}
                                return false;
                            }
                        });

                        ViewGroup rootView = findViewById(android.R.id.content);
                        if (rootView != null) {
                            rootView.addView(popupWebView, new ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            ));
                        }

                        if (resultMsg != null && resultMsg.obj instanceof WebView.WebViewTransport) {
                            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                            transport.setWebView(popupWebView);
                            resultMsg.sendToTarget();
                        }

                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }

                @Override
                public void onCloseWindow(WebView window) {
                    closePopupWebView();
                    if (defaultClient != null) {
                        try {
                            defaultClient.onCloseWindow(window);
                        } catch (Exception ignored) {}
                    }
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (defaultClient != null) {
                        return defaultClient.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                    }
                    return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                }

                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    if (defaultClient != null) {
                        defaultClient.onPermissionRequest(request);
                    } else {
                        super.onPermissionRequest(request);
                    }
                }

                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    if (defaultClient != null) {
                        defaultClient.onGeolocationPermissionsShowPrompt(origin, callback);
                    } else {
                        super.onGeolocationPermissionsShowPrompt(origin, callback);
                    }
                }

                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    if (defaultClient != null) {
                        return defaultClient.onConsoleMessage(consoleMessage);
                    }
                    return super.onConsoleMessage(consoleMessage);
                }

                @Override
                public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                    if (defaultClient != null) {
                        return defaultClient.onJsAlert(view, url, message, result);
                    }
                    return super.onJsAlert(view, url, message, result);
                }

                @Override
                public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                    if (defaultClient != null) {
                        return defaultClient.onJsConfirm(view, url, message, result);
                    }
                    return super.onJsConfirm(view, url, message, result);
                }

                @Override
                public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                    if (defaultClient != null) {
                        return defaultClient.onJsPrompt(view, url, message, defaultValue, result);
                    }
                    return super.onJsPrompt(view, url, message, defaultValue, result);
                }

                @Override
                public void onShowCustomView(View view, CustomViewCallback callback) {
                    if (defaultClient != null) {
                        defaultClient.onShowCustomView(view, callback);
                    } else {
                        super.onShowCustomView(view, callback);
                    }
                }

                @Override
                public void onHideCustomView() {
                    if (defaultClient != null) {
                        defaultClient.onHideCustomView();
                    } else {
                        super.onHideCustomView();
                    }
                }
            });
        }
    }

    private void closePopupWebView() {
        runOnUiThread(() -> {
            if (popupWebView != null) {
                try {
                    ViewGroup rootView = findViewById(android.R.id.content);
                    if (rootView != null) {
                        rootView.removeView(popupWebView);
                    }
                    popupWebView.destroy();
                } catch (Exception ignored) {}
                popupWebView = null;
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (popupWebView != null) {
            if (popupWebView.canGoBack()) {
                popupWebView.goBack();
            } else {
                closePopupWebView();
            }
            return;
        }
        super.onBackPressed();
    }

    @Override
    public void onDestroy() {
        closePopupWebView();
        super.onDestroy();
    }
}
