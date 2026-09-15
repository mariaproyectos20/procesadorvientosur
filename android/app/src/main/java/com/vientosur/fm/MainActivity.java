package com.vientosur.fm;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final int AUDIO_PERMISSION_REQUEST = 7001;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		requestMicrophonePermission();
	}

	private void requestMicrophonePermission() {
		if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
			java.util.ArrayList<String> permissions = new java.util.ArrayList<>();
			if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.RECORD_AUDIO);
			if (checkSelfPermission(Manifest.permission.MODIFY_AUDIO_SETTINGS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
			if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.READ_MEDIA_AUDIO") != PackageManager.PERMISSION_GRANTED) permissions.add("android.permission.READ_MEDIA_AUDIO");
			if (android.os.Build.VERSION.SDK_INT < 33 && checkSelfPermission("android.permission.READ_EXTERNAL_STORAGE") != PackageManager.PERMISSION_GRANTED) permissions.add("android.permission.READ_EXTERNAL_STORAGE");
			if (!permissions.isEmpty()) requestPermissions(permissions.toArray(new String[0]), AUDIO_PERMISSION_REQUEST);
		}
	}
}
