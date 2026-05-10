# ShadowPrac

英語シャドーイング練習アプリ。YouTube URLやローカル音声ファイルをインポートし、自動文字起こし・チャンク分割を行い、カラオケ風字幕再生・録音・多軸スコアリングで練習できます。

> **免責事項**: 本ツールは個人の学習目的のみを想定しています。コンテンツプラットフォームの利用規約の遵守は利用者の責任となります。

> **プライバシー**: コンテンツのインポート後、すべての処理はローカルで実行されます（文字起こし、TTS、スコアリング、辞書検索）。音声やテキストが外部サーバーに送信されることはありません。ネットワークアクセスが発生するのは、YouTubeダウンロード（yt-dlp）と初回のpiper音声モデルダウンロードのみです。

## 機能

- **インポート**: YouTube URL またはローカルの音声/動画ファイル（m4a, mp3, wav, mp4 等）
- **トランスクリプト入力**（オプション）: InfoQやTED等のトランスクリプトを貼り付け可能。Whisperは単語タイムスタンプの取得のみに使用され、貼り付けたテキストが表示・スコアリングの正解テキストになります
- **トランスクリプト自動クリーニング**: 発話者名、タイムスタンプ、セクション見出し、ステージディレクション（[applause]等）を自動除去
- **自動文字起こし**: OpenAI Whisper（small.en）による単語レベルのタイムスタンプ付き文字起こし
- **スマート分割**: 自然な発話のポーズで約15〜45秒のチャンクに自動分割
- **カラオケ再生**: 音声に同期した単語カラー表示
- **単語クリックでシーク**: スクリプト内の単語をクリックしてその位置にジャンプ
- **音声切替**: Synth（piper TTSイギリス英語、完全オフライン）/ Original（元の音声）を切替可能
- **再生コントロール**: リスタート、文/単語スキップ、速度調整（0.05刻み）、音量調整（0〜200%ブースト対応、Web Audio API GainNode使用）
- **録音中コントロールロック**: 録音中はすべてのプレイヤー操作が無効化され、誤操作を防止
- **シャドーイング練習**: 録音して多軸スコアを取得
- **多軸スコアリング**:
  - **正確性（WER）**: 参照テキストとのWord Error Rate
  - **タイミング（Prosody）**: 参照音声に対する発話タイミングの追従度
  - 音声モードに応じて自動切替（Synth → TTS タイミング基準、Original → 元音声タイミング基準）
- **試行管理**: 各練習はナンバリングされ、スコア詳細とともに保存
- **スコア履歴**: 試行番号、正確性%、タイミング%を一覧表示
- **ボキャブラリーリスト**: 内容語を抽出し、CEFRレベル（A1〜C1+）で難易度表示、頻出順/アルファベット順/難易度順でソート、単語クリックで発音再生
- **スクリプト表示/非表示**: カラオケ字幕とフルテキストの表示を切替可能
- **単語アライメント**: スコアリング後に正解/置換/欠落/挿入を色分け表示
- **単語アノテーション**（スクリプト内の単語をダブルクリック）:
  - **? Unclear**: 聞き取れない単語にマーク（赤波線下線）
  - **! Stress**: 強勢のある単語にマーク（太字ハイライト）
  - **/ Break**: 意味の区切りをマーク（黄色の `/` 表示）— 再生時に各 `/` で自動停止、Play で次のセグメントへ進行
- **辞書 + IPA発音記号**: 単語ホバーでIPA発音記号と日本語訳を表示（EJDict-hand、約45,000語、Public Domain）
- **ステミング対応**: 活用形（running, services, deployed等）を自動的に原形に変換して辞書検索
- **音声クリーンアップ**: インポート時に背景ノイズ除去・無音区間の圧縮
- **時間範囲指定**: YouTube URLやローカルファイルで開始/終了時間を指定してインポート
- **レスポンシブUI**: スマホブラウザでの練習に対応

## 必要環境

- Python 3.11+
- Node.js 18+
- ffmpeg
- yt-dlp（pip経由でインストール）

## クイックスタート

```bash
./start.sh
```

バックエンドとフロントエンドが同時に起動します。http://localhost:5173 を開いてください。

`Ctrl+C` で両方停止します。

## Docker

```bash
docker compose up --build
```

http://localhost:3000 を開いてください。データはDockerボリューム（`backend-data`）に永続化されます。

```bash
docker compose down       # 停止
docker compose down -v    # 停止 + データ削除
```

## 手動セットアップ

### バックエンド

```bash
cd backend
pip install -r requirements.txt
python main.py
```

APIサーバーが `http://localhost:8000` で起動します。

初回起動時、SQLiteデータベースが `backend/data/` に自動生成されます。

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

開発サーバーが `http://localhost:5173` で起動します。

## 使い方

### 1. コンテンツのインポート

http://localhost:5173 を開き、**+ Import** をクリック。

- **YouTube**: URLを貼り付けてImportをクリック。音声ダウンロード → Whisper文字起こし → チャンク分割 → TTS生成が自動で実行されます。動画の長さによって数分かかります。
- **ローカルファイル**: 音声・動画ファイルをアップロード。
- **トランスクリプト**（オプション）: トークページや字幕等から入手したテキストをテキストエリアに貼り付け。発話者名・タイムスタンプ・セクション見出しは自動でクリーニングされます。指定した場合、Whisperは単語タイミングの取得のみに使用され、貼り付けたテキストが表示・スコアリングの正解テキストになります。

処理中は進捗バーが表示されます。

### 2. セッション一覧

ホーム画面にインポート済みセッションが一覧表示されます（ステータス、長さ、チャンク数）。クリックでチャンク一覧とボキャブラリーを確認できます。

### 3. シャドーイング練習

チャンクをクリックして練習ページを開きます。

**プレイヤー操作（上段）**:
- **Play / Pause**: 再生/一時停止
- **Restart**: チャンク先頭に戻る
- **Sentence / Word スキップ**: 文単位・単語単位で前後に移動

**音声切替**:
- **Synth**: クリアなイギリス英語TTS合成音声（piper, en_GB-cori-high）
- **Original**: 元の音声
- 切替時に速度・音量はデフォルトにリセットされます

**速度 & 音量**（縦並びスライダー）:
- **Speed**: 0〜2.0x、0.05刻み、±ボタン付き
- **Vol**: 0〜200%、Web Audio API GainNodeによるブースト対応、±ボタン付き

**スクリプト**: 「Show Script」でカラオケ字幕を表示。単語が発話に合わせてカラー表示されます。**単語クリック**でその位置にジャンプ。**単語ホバー**でIPA発音記号と日本語訳を確認できます。**ダブルクリック**でアノテーションメニューを開きます。

**単語アノテーション**（単語をダブルクリック）:
- **? Unclear**: 聞き取れない単語にマーク — 赤波線下線
- **! Stress**: 強勢のある単語にマーク — 太字ハイライト
- **/ Break**: 意味の区切りをマーク — 単語の後に黄色の `/` が表示。Break マークがある場合、再生は各 `/` で**自動停止**します。Play を押すと次のセグメントまで再生されます。フレーズ単位のリスニング練習に最適です。

**録音**（ヘッドホン推奨 — スピーカー音声がマイクに入るとスコア精度が下がります）:
1. **Record** をクリック → 音声が最初から自動再生されます。録音中はすべてのプレイヤー操作がロックされます。
2. 音声に合わせてシャドーイング
3. **Stop & Score** をクリック → 録音がWhisperで文字起こしされ、参照テキストと比較してスコアが算出されます
4. スコアを確認:
   - **Accuracy** サークル: WERベースのパーセンテージ（単語の正確性）
   - **Timing** サークル: プロソディスコア（参照音声に対するタイミング追従度）
   - 単語レベルの内訳: 正解/置換/脱落/挿入
   - 平均タイミングオフセット（秒数）

プロソディの比較基準は音声モードに連動します。Synthで練習した場合はTTSのタイミングと比較、Originalで練習した場合は元音声のタイミングと比較されます。

試行はチャンクごとにナンバリングして保存されます。**History** ドロップダウンで過去の試行を確認できます（試行番号、正確性%、タイミング%表示）。

### 4. ボキャブラリー

セッション詳細ページで **Vocabulary** タブに切替。

- 全チャンクから内容語を抽出（冠詞・前置詞・代名詞などの機能語は除外）
- 各単語に **CEFRレベル**（A1/A2/B1/B2/C1+）をコーパス頻度から推定して表示
- **ソート**: 難易度順、頻出順、アルファベット順
- **フィルター**: レベルボタンで絞り込み、テキスト検索
- **単語クリック** で発音を再生
- **単語ホバー** でIPA発音記号と日本語訳をツールチップ表示（[EJDict-hand](https://github.com/kujirahand/EJDict)、約45,000語）
- 活用形（複数形、過去形、-ing形など）は自動的に原形に変換して辞書検索

カラオケ字幕の単語でも同様にホバーでIPA・和訳を確認できます。

## 設定

`backend/config.py` を編集:

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| `WHISPER_ENGINE` | `openai-whisper` | `openai-whisper` または `faster-whisper` |
| `WHISPER_MODEL` | `small.en` | Whisperモデルサイズ: tiny/base/small/medium/large（.enで英語専用） |
| `WHISPER_SCORING_MODEL` | `small.en` | 録音スコアリングに使用するモデル |
| `TTS_PIPER_MODEL` | `en_GB-cori-high` | Piper音声モデル名 |
| `PORT` | `8000` | バックエンドのポート番号 |

## プロジェクト構成

```
shadow-prac/
├── backend/
│   ├── main.py              # FastAPIアプリ
│   ├── config.py            # 設定
│   ├── db.py                # SQLiteセットアップ（sessions, chunks, attempts, scores, annotations）
│   ├── models.py            # Pydanticスキーマ
│   ├── requirements.txt
│   ├── regen_tts.py         # ユーティリティ: TTSの単語タイミング再生成
│   ├── routers/
│   │   ├── import_router.py # インポート + 処理パイプライン
│   │   ├── sessions.py      # セッションCRUD
│   │   ├── chunks.py        # チャンクデータ + 音声配信
│   │   ├── scoring.py       # 録音アップロード + WER + プロソディスコアリング
│   │   ├── vocab.py         # ボキャブラリー抽出
│   │   ├── dictionary.py    # 辞書 + IPA検索
│   │   ├── annotations.py   # 単語アノテーションCRUD（unclear/stress/break）
│   │   └── tts.py           # 単語TTS
│   ├── services/
│   │   ├── downloader.py    # yt-dlp + ffmpeg
│   │   ├── transcriber.py   # Whisper文字起こし + 強制アライメント
│   │   ├── text_processing.py # フィラー除去、チャンク分割、トランスクリプトクリーニング
│   │   ├── tts_service.py   # piper TTS + 単語タイミング
│   │   ├── scorer.py        # jiwer WERスコアリング
│   │   ├── prosody.py       # プロソディ/タイミングスコア算出
│   │   ├── word_level.py    # wordfreqによるCEFRレベル推定
│   │   └── dictionary.py    # EJDict-hand辞書検索 + IPA + ステミング
│   ├── dict/
│   │   └── ejdict.txt       # 英和辞書（Public Domain、バンドル）
│   └── data/                # ランタイムデータ（gitignore対象）
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # ルーター
│   │   ├── api.ts           # バックエンドAPIクライアント
│   │   ├── types.ts         # TypeScriptインターフェース
│   │   ├── pages/           # ImportPage, SessionList, SessionDetail, PracticePage
│   │   ├── components/      # KaraokePlayer, WordDisplay, Recorder, ScoreDisplay, VocabList, ChunkSelector
│   │   └── hooks/           # useAudioPlayer, useRecorder
│   └── ...
├── docker-compose.yml
└── README.md
```

## 技術スタック

- **バックエンド**: Python, FastAPI, SQLite, OpenAI Whisper, piper-tts, jiwer, yt-dlp, wordfreq, eng-to-ipa
- **フロントエンド**: React, TypeScript, Vite
- **音声処理**: Web Audio API（ブラウザ側録音 + GainNodeボリュームブースト）, ffmpeg（サーバー側処理）
