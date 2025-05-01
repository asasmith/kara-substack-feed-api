import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class SubstackGithubDeployRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const oidcProvidersArn = cdk.Arn.format(
      {
        service: "iam",
        region: "",
        account: "342811584933",
        resource: "oidc-provider/token.actions.githubusercontent.com",
      },
      this,
    );

    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GithubOIDC",
      oidcProvidersArn,
    );

    const githubDeployRole = new iam.Role(this, "GithubDeployRole", {
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:asasmith/kara-substack-feed-api:*",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      roleName: "SubstackGithubDeployRole",
    });

    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DescribeStacks",
          "cloudformation:GetTemplate",
          "cloudformation:DescribeStackResources",
          "s3:CreateBucket",
          "s3:PutBucketPolicy",
          "s3:GetBucketLocation",
          "s3:PutEncryptionConfiguration",
          "s3:PutBucketPublicAccessBlock",
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:DeleteFunction",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:GET",
          "apigateway:DELETE",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:AttachRolePolicy",
          "iam:PassRole",
          "logs:CreateLogGroup",
          "logs:PutRetentionPolicy",
        ],
        resources: ["*"],
      }),
    );
  }
}
