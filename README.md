## Amazon GameLift Streams用サンプルWebアプリケーション

URL共有機能を備えたブラウザベースのゲームストリーミングを可能にする、Amazon GameLift Streams用の簡単にデプロイできるWebアプリケーションのサンプルです。

**⚠️ 重要なお知らせ**
このコードはテストおよび評価目的のサンプルコードであり、本番環境での使用は推奨されません。本番クライアントアプリケーションの作成に関するガイダンス、適切なテストおよび評価手順については、_Amazon GameLift Streams 開発者ガイド_の[Webクライアント](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/sdk.html)セクションを参照してください。

### ステップ1: 前提条件の確認

次のステップに進む前に、以下の前提条件を確認してください：

1. プログラムによるアクセスに適切な認証情報を持つAWSアカウント。詳細な手順については、_Amazon GameLift Streams 開発者ガイド_の[Amazon GameLift Streamsのセットアップ](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/setting-up.html)を参照してください。
2. Amazon GameLift Streams対応のWebブラウザ。_Amazon GameLift Streams 開発者ガイド_の[対応ブラウザと入力](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/sdk-browsers-input.html)を参照してください。
3. Node.js 16以上。[Node.jsダウンロードページ](https://nodejs.org/en/download)からダウンロードしてください。

### ステップ2: Web SDKの依存関係をダウンロード

いずれのコンポーネントを使用する前に、最新のAmazon GameLift Streams Web SDKを取得し、プロジェクトファイルに配置する必要があります。

1. このリポジトリをコンピュータにクローンします。
2. Amazon GameLift Streamsから最新の[Web SDKバンドル](https://gameliftstreams-public-website-assets.s3.us-west-2.amazonaws.com/AmazonGameLiftStreamsWebSDK-v1.0.0.zip)をダウンロードします。
3. バンドルを解凍します。
4. `gameliftstreams-x.x.x.mjs`と`gameliftstreams-x.x.x.js`ファイルをこのプロジェクトの`server/public`フォルダにコピーします（`index.html`などの他のソースファイルの隣に）

### ステップ3: コンポーネントのセットアップ

必要に応じて、以下のコンポーネントのいずれかまたは両方をセットアップできます：

#### ローカルWebサーバー

**Windows:**

- `install_server.bat`を実行

**Linux/OSX:** ターミナルを開いて以下のコマンドを入力：

```
chmod +x install_server.sh
./install_server.sh
```

インストールスクリプトの実行に問題がある場合は、以下を試してください：

```
dos2unix install_server.sh
```

#### URL共有

このAWS Cloud Development Kit（CDK）スタックをデプロイするには、AWSアカウントに以下の追加ツールと権限/設定が必要です：

1. **基本的なAWS Identity and Access Management（IAM）権限**:
   
   - Amazon CloudFormationフルアクセス（`cloudformation:*`）
   - AWS IAMロール作成権限（`iam:CreateRole`、`iam:PutRolePolicy`など）
   - AWS Lambda管理権限（`lambda:*`）
   - Amazon API Gateway管理権限（`apigateway:*`）
   - Amazon GameLift Streams権限（`gameliftstreams:*`）
   - Amazon CloudWatch Logs権限（AWS Lambdaログ用）

2. **AWS CDKブートストラップ**: アカウント/リージョンはAWS CDK用にブートストラップされている必要があります。
   詳細はこちらを参照してください：https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html

3. **AWS CLI設定**: AWS CLIが適切な認証情報で設定されていることを確認してください。
   詳細はこちらを参照してください：https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-configure.html

4. **デプロイメント環境変数**: AWS CDKスタックをデプロイする際、AWSリージョンを指定するために標準の`CDK_DEFAULT_REGION`環境変数を使用できます。これはコード内でリージョンをハードコードするよりも良い方法とされています。
   例：
   **Windows**:
   
       set CDK_DEFAULT_REGION=us-west-2 deploy_cdk.bat
   
   **Linux/OSX**:
   
       export CDK_DEFAULT_REGION=us-west-2 ./deploy_cdk.sh

**デプロイとインストール:**

1. Amazon GameLift Streamsコンソールのダッシュボードで、Stream groupsを選択します。

2. ストリーミング元のストリームグループを選択し、その「Stream group ID」を確認します。デプロイメントスクリプトを実行する際に必要になります。ストリーミングしたいアプリケーションが関連付けられていることを確認してください。

3. AWS CDKスタックをデプロイします。

**Windows:** ターミナルを開いて以下のコマンドを使用：

例：

```
deploy_cdk.bat sg-000000000
# 'sg-000000000'の代わりにあなたのストリームグループIDを使用
```

**Linux/OSX:** ターミナルを開いて以下のコマンドを使用：

```
chmod +x deploy_cdk.sh
./deploy_cdk.sh sg-000000000
```

スクリプトの実行に問題がある場合は、以下を試してください：

```
dos2unix deploy_cdk.sh
```

4. デプロイメントが完了すると、共有可能なストリームURLが以下の形式で出力されます：
   
   https://[API-ID].execute-api.[REGION].amazonaws.com/prod/?userId={プレイヤー名}&applicationId={アプリケーションID}&location={AWSリージョン}

## 含まれる機能

- **自動セットアップスクリプト** - 必要な依存関係の確認とインストール：
  
  - Node.js
  - AWS CLI
  - AWS CDK
  - AWS認証情報設定（CDKデプロイメント用）

- **リアルタイムクライアントサイドWebRTCメトリクス**
  
  - WebRTCパフォーマンスモニタリング
  
  - 移動可能なメトリクスウィジェット
  
  - フルスクリーン対応
  
  - CSVエクスポート機能
    
    WebRTCメトリクスの詳細はこちら：https://www.w3.org/TR/webrtc-stats

- **モバイルサポート**
  
  - 自動モバイルデバイス検出
  - カスタマイズ可能な仮想コントローラー
  - タッチコントロール
  - 画面の向き設定

## コスト情報

通常の使用はAWS CloudFormationの無料利用枠内に収まるはずです。詳細はこちら：
[Provision Infrastructure As Code – AWS CloudFormation Pricing – Amazon Web Services](https://aws.amazon.com/cloudformation/pricing/)

## 依存関係

**AWS SDK関連:**

- @aws-sdk/client-bedrock-runtime
- @aws-sdk/client-cloudwatch
- aws-sdk

**サードパーティパッケージ:**

- chart.js
- cors
- express
- node-fetch
- serverless-http 

### CDKスタックのアンインストール

1. **CloudFormationスタックの削除**:
   
   - AWS Management Consoleにログインします。
   - AWS CloudFormationサービスに移動します。
   - AWS CloudFormationダッシュボードで、`gameliftstreams-share-url-cdk`という名前のスタックを見つけて選択します。
   - 「削除」ボタンをクリックしてこのスタックを削除します。
   - 次に、`CDKToolkit`という名前のスタックを見つけて、同じプロセスを繰り返して削除します。
   - スタックはこの順序で削除することが重要です。`CDKToolkit`スタックは`gameliftstreams-share-url-cdk`スタックに依存している可能性があるためです。

2. **Amazon S3バケットの削除**:
   
   - AWS Management Consoleで、Amazon S3サービスに移動します。
   - 作成されたAmazon S3バケットを見つけます。
   - まず、バケットの内容を空にします。これは以下のいずれかの方法で行えます：
     - バケット内のすべてのオブジェクトを手動で削除する。
     - Amazon S3コンソールの「空にする」ボタンを使用してバケットを空にする。
   - バケットが空になったら、バケット自体を削除できます。

## セキュリティ

詳細は[CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)を参照してください。

## ライセンス

このライブラリはMIT-0ライセンスの下でライセンスされています。LICENSEファイルを参照してください。
