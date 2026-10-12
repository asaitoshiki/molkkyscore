package io.github.asaitoshiki.molkkyscore;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * ホーム画面の「今すぐ PLAY」ウィジェット。押すと試合の準備画面を開く。
 * 画面の切り替えは Web 側が受け持つので、ここでは決まった URL でアプリを起こすだけにする。
 */
public class PlayWidgetProvider extends AppWidgetProvider {

    /** Web 側（src/native/widgetLaunch.ts）と揃えること */
    static final String PLAY_URL = "molkkyscore://play";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(PLAY_URL), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pending = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.play_widget);
        views.setOnClickPendingIntent(R.id.play_widget_root, pending);
        for (int widgetId : widgetIds) {
            manager.updateAppWidget(widgetId, views);
        }
    }
}
