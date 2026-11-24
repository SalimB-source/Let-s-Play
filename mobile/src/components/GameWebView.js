import React, { forwardRef } from 'react';
import { WebView } from 'react-native-webview';

const GameWebView = forwardRef(function GameWebView(
  { uri, injectedBeforeLoad, onBridgeMessage, onLoadEnd },
  ref,
) {
  return (
    <WebView
      ref={ref}
      source={{ uri }}
      style={{ flex: 1, backgroundColor: '#05060f' }}
      originWhitelist={['https://*', 'http://*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event?.nativeEvent?.data || '{}');
          onBridgeMessage?.(data);
        } catch {
          // message non-JSON ignoré
        }
      }}
      onLoadEnd={onLoadEnd}
    />
  );
});

export default GameWebView;
