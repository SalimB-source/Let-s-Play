package dz.letsplay.officiel;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
    /** Demande micro/caméra de la WebView en attente d'un accord Android. */
    private PermissionRequest pendingMediaRequest;

    /** Code de la demande d'autorisation micro/caméra (appels vocaux/vidéo). */
    private static final int REQUEST_MEDIA_PERMISSIONS = 4210;

    /**
     * Routage audio d'un appel. Sans ça, Android envoie la voix dans
     * l'écouteur (mode communication) alors que l'appel vidéo sort du
     * haut-parleur : le vocal semble muet quand on regarde l'écran.
     */
    private AudioManager audioManager;
    private boolean callAudioRouted;
    private int savedAudioMode = AudioManager.MODE_NORMAL;
    private boolean savedSpeakerphone;

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
        // Le son distant arrive après la négociation WebRTC, bien après le
        // clic « Répondre ». Sans ça, la WebView peut refuser de le jouer.
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setBackgroundColor(Color.BLACK);
        // Le site demande le haut-parleur le temps de l'appel (voir
        // preferLoudspeaker dans CallsContext). Inerte hors de l'APK.
        webView.addJavascriptInterface(new CallAudioBridge(), "LetsPlayAndroid");

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
            /**
             * Appels vocaux / vidéo du site : la WebView demande le micro
             * et/ou la caméra. Refuser ici rendrait `getUserMedia()`
             * systématiquement impossible dans l'app — donc aucun appel. On
             * n'accorde que ce qui est demandé, et seulement si le joueur a
             * donné l'autorisation Android correspondante (sinon on la lui
             * demande, puis on tranche dans `onRequestPermissionsResult`).
             */
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                List<String> wanted = Arrays.asList(request.getResources());
                boolean needsAudio = wanted.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                boolean needsVideo = wanted.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);

                List<String> granted = new ArrayList<>();
                List<String> missing = new ArrayList<>();
                if (needsAudio) {
                    if (hasPermission(Manifest.permission.RECORD_AUDIO)) {
                        granted.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    } else {
                        missing.add(Manifest.permission.RECORD_AUDIO);
                    }
                }
                if (needsVideo) {
                    if (hasPermission(Manifest.permission.CAMERA)) {
                        granted.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                    } else {
                        missing.add(Manifest.permission.CAMERA);
                    }
                }

                if (!missing.isEmpty()) {
                    pendingMediaRequest = request;
                    requestPermissions(missing.toArray(new String[0]), REQUEST_MEDIA_PERMISSIONS);
                    return;
                }
                settleMediaRequest(request, granted);
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

    /** L'autorisation Android est-elle déjà accordée ? (minSdk 23) */
    private boolean hasPermission(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    /** Rend la décision à la WebView : ce qui est accordé, le reste refusé. */
    private void settleMediaRequest(PermissionRequest request, List<String> granted) {
        if (request == null) {
            return;
        }
        if (granted.isEmpty()) {
            request.deny();
            return;
        }
        request.grant(granted.toArray(new String[0]));
        if (granted.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
            runOnUiThread(this::routeCallToSpeaker);
        }
    }

    private void ensureAudioManager() {
        if (audioManager == null) {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        }
    }

    /** Voix dans le haut-parleur, comme l'appel vidéo — pas dans l'écouteur. */
    private void routeCallToSpeaker() {
        ensureAudioManager();
        if (audioManager == null) {
            return;
        }
        if (!callAudioRouted) {
            savedAudioMode = audioManager.getMode();
            savedSpeakerphone = audioManager.isSpeakerphoneOn();
            callAudioRouted = true;
        }
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        audioManager.setSpeakerphoneOn(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            for (AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
                if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                    audioManager.setCommunicationDevice(device);
                    break;
                }
            }
        }
        // API historique : présente depuis bien avant minSdk 23, et suffit à
        // empêcher une autre app de couper la voix. (AudioFocusRequest est
        // API 26 — un champ de ce type ferait planter le chargement de
        // l'activité sur Android 6.)
        audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL,
                AudioManager.AUDIOFOCUS_GAIN);
    }

    /** Rend le routage d'avant l'appel (musique, autres apps). */
    private void restoreAudioRoute() {
        if (audioManager == null || !callAudioRouted) {
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            }
            audioManager.abandonAudioFocus(null);
            audioManager.setSpeakerphoneOn(savedSpeakerphone);
            audioManager.setMode(savedAudioMode);
        } catch (RuntimeException ignored) {
            // Un appareil peut refuser le changement de mode : l'appel est fini.
        }
        callAudioRouted = false;
    }

    /** Pont appelé par le site : `LetsPlayAndroid.setCallAudio(true|false)`. */
    private final class CallAudioBridge {
        @JavascriptInterface
        public void setCallAudio(boolean active) {
            runOnUiThread(() -> {
                if (active) {
                    routeCallToSpeaker();
                } else {
                    restoreAudioRoute();
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_MEDIA_PERMISSIONS) {
            return;
        }
        PermissionRequest request = pendingMediaRequest;
        pendingMediaRequest = null;

        List<String> granted = new ArrayList<>();
        for (int i = 0; i < permissions.length; i++) {
            boolean ok = i < grantResults.length && grantResults[i] == PackageManager.PERMISSION_GRANTED;
            if (!ok) {
                continue;
            }
            if (Manifest.permission.RECORD_AUDIO.equals(permissions[i])) {
                granted.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
            } else if (Manifest.permission.CAMERA.equals(permissions[i])) {
                granted.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
            }
        }
        settleMediaRequest(request, granted);
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

    @Override
    protected void onDestroy() {
        restoreAudioRoute();
        super.onDestroy();
    }
}
