import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";

export class KaraSubstackFeedApiStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const saturdayPaperTable = new dynamoDb.Table(this, "SaturdayPaperEmailSubs", {
            tableName: 'SaturdayPaperEmailSubs',
            partitionKey: {
                name: 'email',
                type: dynamoDb.AttributeType.STRING,
            },
            billingMode: dynamoDb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
        });

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
                    allowedOrigins: ['*'],
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedHeaders: ['*'],
                    exposedHeaders: [],
                },
            ],
        });

        const substackFeedLambda = new lambda.Function(this, "SubstackFeedLambda", {
            runtime: lambda.Runtime.NODEJS_22_X,
            code: lambda.Code.fromAsset("lambda/dist"),
            handler: "index.handler",
            environment: {
                BUCKET_NAME: bucket.bucketName,
                FEED_URL: "https://kararedman.substack.com/feed",
            },
        });

        bucket.grantPut(substackFeedLambda);

        const subscribeLambda = new lambda.Function(this, "SubstackSubscribeLambda", {
            runtime: lambda.Runtime.NODEJS_22_X,
            code: lambda.Code.fromAsset("lambda/dist"),
            handler: "subscribe.handler",
            environment: {
                TABLE_NAME: saturdayPaperTable.tableName,
            },
        });

        saturdayPaperTable.grantWriteData(subscribeLambda);

        const api = new apigateway.RestApi(this, "SubstackApiGateway", {
            restApiName: "KaraSubstackApi",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            },
        });

        api.root.addProxy({
            defaultIntegration: new apigateway.LambdaIntegration(substackFeedLambda),
            anyMethod: true,
        });

        const subscribe = api.root.addResource("subscribe")
        subscribe.addMethod("POST", new apigateway.LambdaIntegration(subscribeLambda), {
            methodResponses: [
                {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Origin": true,
                    },
                },
            ],
        })
    }
}
