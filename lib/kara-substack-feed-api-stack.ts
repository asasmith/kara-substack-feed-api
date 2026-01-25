import { Stack, StackProps, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import path from "path";

export class KaraSubstackFeedApiStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const saturdayPaperTable = new dynamoDb.Table(
            this,
            "SaturdayPaperEmailSubs",
            {
                tableName: "SaturdayPaperEmailSubs",
                partitionKey: {
                    name: "email",
                    type: dynamoDb.AttributeType.STRING,
                },
                billingMode: dynamoDb.BillingMode.PAY_PER_REQUEST,
                removalPolicy: RemovalPolicy.DESTROY,
            },
        );

        const blockPublicAccess = new s3.BlockPublicAccess({
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
        });

        const bucket = new s3.Bucket(this, "SubstackFeedBucket", {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: blockPublicAccess,
            publicReadAccess: true,
            websiteIndexDocument: "feed.json",
            cors: [
                {
                    allowedOrigins: ["*"],
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedHeaders: ["*"],
                    exposedHeaders: [],
                },
            ],
        });

        const substackFeedLambda = new NodejsFunction(this, "SubstackFeedLambda", {
            runtime: Runtime.NODEJS_22_X,
            entry: path.join(__dirname, "../lambda/index.ts"),
            handler: "handler",
            timeout: Duration.seconds(15),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                FEED_URL: "https://kararedman.substack.com/feed",
            },
        });

        bucket.grantPut(substackFeedLambda);

        new events.Rule(this, "WeeklyWebBlogUpdate", {
            schedule: events.Schedule.cron({
                minute: "0",
                hour: "21",
                weekDay: "SAT",
            }),
            targets: [new targets.LambdaFunction(substackFeedLambda)],
        });

        const subscribeLambda = new NodejsFunction(
            this,
            "SubstackSubscribeLambda",
            {
                runtime: Runtime.NODEJS_22_X,
                entry: path.join(__dirname, "../lambda/subscribe.ts"),
                handler: "handler",
                environment: {
                    TABLE_NAME: saturdayPaperTable.tableName,
                },
            },
        );

        saturdayPaperTable.grantWriteData(subscribeLambda);

        const api = new apigateway.RestApi(this, "SubstackApiGateway", {
            restApiName: "KaraSubstackApi",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            },
        });

        const feed = api.root.addResource("feed-update");
        feed.addMethod(
            "POST",
            new apigateway.LambdaIntegration(substackFeedLambda, { proxy: true }),
        );

        const subscribe = api.root.addResource("subscribe");
        subscribe.addMethod(
            "POST",
            new apigateway.LambdaIntegration(subscribeLambda, { proxy: true }),
            {},
        );
    }
}
