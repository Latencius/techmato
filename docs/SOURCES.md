# SOURCES — ニュースソース定義

このファイルがニュース取得対象の**唯一の正**。追加・変更・削除は必ずここを更新してから実装。

## 採用基準

- **RSS or 公式APIを提供している**(スクレイピングは最終手段)
- **AI / テック / ソフトウェア開発に関連する**
- **更新頻度が高い**(理想は1日数本以上)
- **信頼できる発信元**

## ソースリスト(MVP)

### 英語ソース

| 名前 | URL | RSS/API | 優先度 | 備考 |
|------|-----|---------|--------|------|
| Hacker News (Top) | https://news.ycombinator.com/ | https://hnrss.org/frontpage | High | 上位30件、コメント数も取れる |
| TechCrunch | https://techcrunch.com/ | https://techcrunch.com/feed/ | High | 全記事RSS |
| The Verge (Tech) | https://www.theverge.com/ | https://www.theverge.com/rss/index.xml | Medium | テック系の記事 |
| Ars Technica | https://arstechnica.com/ | https://feeds.arstechnica.com/arstechnica/index | Medium | 技術記事中心 |
| Anthropic Blog | https://www.anthropic.com/news | https://www.anthropic.com/news/rss.xml | High | Claude関連発表 |
| OpenAI Blog | https://openai.com/blog | https://openai.com/blog/rss.xml | High | (RSS要確認) |
| Google AI Blog | https://blog.google/technology/ai/ | RSS要確認 | Medium | |
| GitHub Blog | https://github.blog/ | https://github.blog/feed/ | Medium | 開発者向け |

### 日本語ソース(必要に応じて追加)

| 名前 | URL | RSS | 優先度 | 備考 |
|------|-----|-----|--------|------|
| Publickey | https://www.publickey1.jp/ | https://www.publickey1.jp/atom.xml | Medium | エンタープライズIT |
| ITmedia AI+ | https://www.itmedia.co.jp/aiplus/ | RSS要確認 | Low | |

## ソース定義(TypeScript)

実装時はこのファイルから`packages/pipeline/src/sources/registry.ts`に転記:

```typescript
export type NewsSource = {
  id: string;
  name: string;
  rssUrl: string;
  language: 'en' | 'ja';
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
  // 取得時の最大記事数(直近)
  maxArticles?: number;
};

export const SOURCES: NewsSource[] = [
  {
    id: 'hackernews',
    name: 'Hacker News',
    rssUrl: 'https://hnrss.org/frontpage',
    language: 'en',
    priority: 'high',
    enabled: true,
    maxArticles: 30,
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    rssUrl: 'https://techcrunch.com/feed/',
    language: 'en',
    priority: 'high',
    enabled: true,
    maxArticles: 20,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    rssUrl: 'https://www.anthropic.com/news/rss.xml',
    language: 'en',
    priority: 'high',
    enabled: true,
  },
  // ...残りはClaude Codeに依頼
];
```

## 取得ロジックの方針

### フィルタリング
- 公開時刻が**過去24時間以内**のみ採用
- 重複排除: URLとタイトルの正規化(末尾スラッシュ、UTMパラメータ除去)

### エラーハンドリング
- 個別ソース失敗はスキップ、ログに記録
- 全ソース失敗時のみエラー(リトライ提示)

### レート制限への配慮
- 各ソース間は500msのディレイを入れる
- User-Agent: `techmato/1.0 (+https://github.com/Latencius)` などを設定

## ソースの追加手順

1. このファイルの表に追記
2. RSSが正しく動作することを手動で確認
   ```bash
   curl -A "techmato/1.0" "https://example.com/feed.xml" | head -50
   ```
3. `packages/pipeline/src/sources/registry.ts` に追加
4. テストで取得確認

## 将来の拡張アイデア(MVP外)

- カテゴリ分類(AI / Web / セキュリティ / etc)
- ユーザーごとの優先ソース設定
- ソースごとの重み付け選定
- スクレイピング対応(RSSがないが重要なソース)
- Reddit (r/MachineLearning, r/programming) 対応
- arXiv の新着論文(AI/ML分野)
