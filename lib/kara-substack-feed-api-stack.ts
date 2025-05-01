import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class KaraSubstackFeedApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const blockPublicAccess = new s3.BlockPublicAccess({
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
        });

        const bucket = new s3.Bucket(this, "SubstackFeedBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
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

        const substackLambda = new lambda.Function(this, "SubstackFeedLambda", {
            runtime: lambda.Runtime.NODEJS_22_X,
            code: lambda.Code.fromAsset("lambda"),
            handler: "index.handler",
            environment: {
                BUCKET_NAME: bucket.bucketName,
                FEED_URL: "https://kararedman.substack.com/feed",
            },
        });

        bucket.grantPut(substackLambda);

        new apigateway.LambdaRestApi(this, "SubstackApiGateway", {
            handler: substackLambda,
            proxy: true,
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: ["POST"],
            },
        });
    }
}
