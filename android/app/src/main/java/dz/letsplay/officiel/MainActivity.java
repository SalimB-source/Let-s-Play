package dz.letsplay.officiel;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * Coque Android du site Let's Play (https://let-s-play-nu.vercel.app).
 *
 * Le contenu vit en ligne : chaque mise à jour du site est donc visible
 * dans l'app dès la prochaine ouverture, sans republier l'APK. On ne
 * reconstruit l'APK que pour changer l'icône, le nom, la version ou une
 * fonctionnalité native.
 */
public class MainActivity extends Activity {

    /** Domaine servi dans la WebView — toute autre URL part vers une app externe. */
    private static final String SITE_HOST = "let-s-play-nu.vercel.app";
    private static final String HOME_URL = "https://" + SITE_HOST + "/";

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private View videoView;                       // vue vidéo plein écran en cours
    private WebChromeClient.CustomViewCallback videoCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Android 15 impose l'edge-to-edge avec targetSdk 35 : protéger le
        // contenu des barres système, des encoches et du clavier. Sur les
        // anciennes versions, le décor a déjà retiré les insets qu'il gère.
        View content = findViewById(android.R.id.content);
        content.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets safeInsets = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safeInsets.left, safeInsets.top,
                        safeInsets.right, safeInsets.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom());
            }
            // Ne pas consommer les insets : les enfants doivent les recevoir.
            return insets;
        });
        content.requestApplyInsets();

        refreshLayout = findViewById(R.id.refresh);
        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);      // thème, session, quizz, listes…
        settings.setAllowFileAccess(false);
        webView.setBackgroundColor(Color.BLACK);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                if (host.equals(SITE_HOST) || host.endsWith("." + SITE_HOST)) {
                    return false;                 // site de l'émission : on reste dans l'app
                }
                // YouTube, Instagram… : on ouvre l'app dédiée ou le navigateur.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                refreshLayout.setRefreshing(false);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();                   // le site n'utilise ni caméra ni micro
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                enterFullscreen(view, callback);  // vidéo YouTube en plein écran
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }
        });

        // D'éventuels liens de téléchargement : délégués au téléphone.
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (ActivityNotFoundException ignored) {
            }
        });

        refreshLayout.setOnRefreshListener(webView::reload);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(HOME_URL);
        }
    }

    /** Affiche une vidéo en plein écran au-dessus de tout. */
    private void enterFullscreen(View view, WebChromeClient.CustomViewCallback callback) {
        if (videoView != null) {
            callback.onCustomViewHidden();
            return;
        }
        videoView = view;
        videoCallback = callback;
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        ((FrameLayout) findViewById(android.R.id.content)).addView(
                view,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
    }

    /** Quitte le plein écran vidéo. */
    private void exitFullscreen() {
        if (videoView == null) {
            return;
        }
        ((FrameLayout) findViewById(android.R.id.content)).removeView(videoView);
        videoView = null;
        if (videoCallback != null) {
            videoCallback.onCustomViewHidden();
            videoCallback = null;
        }
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    @Override
    public void onBackPressed() {
        if (videoView != null) {
            exitFullscreen();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
