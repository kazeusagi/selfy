# Selfy for Android

Selfy の Android アプリです。Kotlin と Jetpack Compose で書いています。

- 初回起動時に、接続する Selfy のドメインを入力します。接続先はアプリに埋め込んでいません
- ログインはメールの確認コードです
- 写真のアップロードと端末への保存は、アプリを閉じても続きます (WorkManager)
- 共有アルバムに写真が追加されると通知します。15分以上の間隔で確認するので、少し遅れます

サーバー側は、このリポジトリの `GET /api/info` などアプリ用の API が入ったバージョンが必要です。

## ビルド

```sh
cd android
./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk
./gradlew testDebugUnitTest
```

JDK 17 と Android SDK が必要です。Android Studio で `android/` を開いても構いません。

## 配布 (GitHub Actions)

`.github/workflows/android.yml` が APK をビルドします。

- `android/` を変更した push と PR: APK を Actions の Artifacts (`selfy-apk`) に置きます
- `android-v0.1.0` のようなタグを push: Releases に APK を載せます

### 署名鍵

Android は、同じ鍵で署名した APK でないと上書き更新できません。最初に1つ作って、ずっと同じものを使います。
なくすと更新できなくなる (入れ直しになる) ので、リポジトリの外に控えを残してください。

```sh
keytool -genkeypair -v -keystore selfy.jks -alias selfy -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 selfy.jks   # macOS は base64 -i selfy.jks
```

リポジトリの Settings → Secrets and variables → Actions に登録します。

| 名前 | 値 |
|---|---|
| `ANDROID_KEYSTORE_B64` | 上の base64 の出力 |
| `ANDROID_KEYSTORE_PASSWORD` | キーストアのパスワード |
| `ANDROID_KEY_ALIAS` | `selfy` |
| `ANDROID_KEY_PASSWORD` | 鍵のパスワード |

登録していないときはデバッグ鍵で署名します。インストールはできますが、ビルドのたびに鍵が変わるので上書き更新はできません。

## 構成

- `data/`: 接続先とログイン状態 (`Session`)、API 通信 (`Api`)
- `transfer/`: 転送の待ち行列 (`TransferQueue`)、バックグラウンド処理 (`UploadWorker` / `DownloadWorker` / `AlbumCheckWorker`)、通知
- `ui/`: 画面

アップロードする写真の変換 (表示用とサムネイルの生成、撮影情報の読み取り) は Web 版の `src/lib/upload.ts` と同じ規則で、`transfer/PhotoRules.kt` にまとめてあります。片方を変えるときはもう片方も合わせてください。
