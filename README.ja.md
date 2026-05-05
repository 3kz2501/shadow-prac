# ShadowPrac

英語シャドーイング練習アプリ。YouTube URLやローカル音声ファイルをインポートし、自動文字起こし・チャンク分割を行い、カラオケ風字幕再生・録音・発音スコアリングで練習できます。

> **免責事項**: 本ツールは個人の学習目的のみを想定しています。コンテンツプラットフォームの利用規約の遵守は利用者の責任となります。

## 機能

- **インポート**: YouTube URL またはローカルの音声/動画ファイル（m4a, mp3, wav, mp4 等）
- **自動文字起こし**: OpenAI Whisper による単語レベルのタイムスタンプ付き文字起こし
- **スマート分割**: 自然な区切りで約30〜90秒のチャンクに自動分割
- **カラオケ再生**: 音声に同期した単語ハイライト表示
- **音声切替**: Synth（TTS合成音声）/ Original（元の音声）を切替可能
- **再生コントロール**: リスタート、文/単語スキップ、速度調整（0.5x〜2.0x）
- **シャドーイング練習**: 録音してWER（単語誤り率）ベースの発音スコアを取得
- **スコア履歴**: チャンクごとの練習履歴を保持
- **ボキャブラリーリスト**: 内容語を抽出し、CEFRレベル（A1〜C1+）で難易度表示、頻出順/アルファベット順/難易度順でソート、単語クリックで発音再生
- **スクリプト表示/非表示**: カラオケ字幕とフルテキストの表示を切替可能
- **単語アライメント**: スコアリング後に正解/置換/欠落/挿入を色分け表示
- **和訳辞書**: 単語ホバーで日本語訳を表示（EJDict-hand、約45,000語、Public Domain）
- **音声クリーンアップ**: インポート時に背景ノイズ除去・無音区間の圧縮
- **時間範囲指定**: YouTube URLやローカルファイルで開始/終了時間を指定してインポート

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

処理中は進捗バーが表示されます。

### 2. セッション一覧

ホーム画面にインポート済みセッションが一覧表示されます（ステータス、長さ、チャンク数）。クリックでチャンク一覧とボキャブラリーを確認できます。

### 3. シャドーイング練習

チャンクをクリックして練習ページを開きます。

**プレイヤー操作（上段）**:
- **Play / Pause**: 再生/一時停止
- **Restart**: チャンク先頭に戻る
- **Sentence / Word スキップ**: 文単位・単語単位で前後に移動

**設定（下段）**:
- **Voice**: **Synth**（クリアなTTS合成音声）と **Original**（元の音声）を切替
- **Speed**: 再生速度を0.5x〜2.0xで調整

**スクリプト**: 「Show Script」でカラオケ字幕を表示。「Hide Script」で非表示。字幕を見ずに耳だけで練習するほうがシャドーイングの効果は高いです。

**録音**:
1. **Record** をクリック → 音声が最初から自動再生されます
2. 音声に合わせてシャドーイング
3. **Stop & Score** をクリック → 録音がWhisperで文字起こしされ、参照テキストと比較してスコアが算出されます
4. スコア（パーセンテージ）、単語レベルの内訳（正解/置換/脱落/挿入）、自分の発話 vs 参照テキストを確認

スコア履歴はチャンクごとに保存されます。**History** ドロップダウンで過去の結果を振り返れます。

### 4. ボキャブラリー

セッション詳細ページで **Vocabulary** タブに切替。

- 全チャンクから内容語を抽出（冠詞・前置詞・代名詞などの機能語は除外）
- 各単語に **CEFRレベル**（A1/A2/B1/B2/C1+）をコーパス頻度から推定して表示
- **ソート**: 難易度順、頻出順、アルファベット順
- **フィルター**: レベルボタンで絞り込み、テキスト検索
- **単語クリック** で発音を再生
- **単語ホバー** で日本語訳をツールチップ表示（[EJDict-hand](https://github.com/kujirahand/EJDict)、約45,000語）

カラオケ字幕の単語でも同様にホバーで和訳を確認できます。

## 設定

`backend/config.py` を編集:

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| `WHISPER_ENGINE` | `openai-whisper` | `openai-whisper` または `faster-whisper` |
| `WHISPER_MODEL` | `base` | Whisperモデルサイズ: tiny/base/small/medium/large |
| `WHISPER_SCORING_MODEL` | `base` | 録音スコアリングに使用するモデル |
| `TTS_VOICE` | `en-US-GuyNeural` | edge-ttsの音声名 |
| `PORT` | `8000` | バックエンドのポート番号 |

## プロジェクト構成

```
shadow-prac/
├── backend/
│   ├── main.py              # FastAPIアプリ
│   ├── config.py            # 設定
│   ├── db.py                # SQLiteセットアップ
│   ├── models.py            # Pydanticスキーマ
│   ├── requirements.txt
│   ├── regen_tts.py         # ユーティリティ: TTSの単語タイミング再生成
│   ├── routers/
│   │   ├── import_router.py # インポート + 処理パイプライン
│   │   ├── sessions.py      # セッションCRUD
│   │   ├── chunks.py        # チャンクデータ + 音声配信
│   │   ├── scoring.py       # 録音アップロード + WERスコアリング
│   │   ├── vocab.py         # ボキャブラリー抽出
│   │   └── tts.py           # 単語TTS
│   ├── services/
│   │   ├── downloader.py    # yt-dlp + ffmpeg
│   │   ├── transcriber.py   # Whisper抽象化
│   │   ├── text_processing.py # フィラー除去、チャンク分割
│   │   ├── tts_service.py   # edge-tts + 単語タイミング
│   │   ├── scorer.py        # jiwer WERスコアリング
│   │   ├── word_level.py    # wordfreqによるCEFRレベル推定
│   │   └── dictionary.py   # EJDict-hand辞書検索
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
├── start.sh                 # 一発起動スクリプト
└── README.md
```

## 技術スタック

- **バックエンド**: Python, FastAPI, SQLite, OpenAI Whisper, edge-tts, jiwer, yt-dlp, wordfreq
- **フロントエンド**: React, TypeScript, Vite
- **音声処理**: Web Audio API（ブラウザ側）, ffmpeg（サーバー側）
