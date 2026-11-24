import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

const GameWebView = forwardRef(function GameWebView({ uri, onLoadEnd }, ref) {
  const iframeRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reload: () => {
      if (iframeRef.current) {
        iframeRef.current.src = uri;
      }
    },
    injectJavaScript: () => {},
  }));

  useEffect(() => {
    const timer = setTimeout(() => onLoadEnd?.(), 600);
    return () => clearTimeout(timer);
  }, [uri, onLoadEnd]);

  return (
    <View style={{ flex: 1, backgroundColor: '#05060f' }}>
      <iframe
        ref={iframeRef}
        src={uri}
        title="Let's Play Arcade"
        allow="autoplay; fullscreen; gamepad"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#05060f',
        }}
        onLoad={() => onLoadEnd?.()}
      />
    </View>
  );
});

export default GameWebView;
