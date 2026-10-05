package it.livetempo.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // System back asks the web app to close its topmost layer (a form, the
        // tempo view, a playlist) and only leaves the app when nothing is open.
        // Not tied to the WebView history, whose entries without a user gesture
        // (e.g. a screen opened by a MIDI pedal) back navigation would skip.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript("(window.App && App.handleBack()) === true", result -> {
                    if (!"true".equals(result)) {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                });
            }
        });
    }
}
