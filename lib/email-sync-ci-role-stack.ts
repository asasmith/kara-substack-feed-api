import { Arn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class SubstackEmailSyncCIRole extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const oidcProviderArn = Arn.format(
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
      oidcProviderArn,
    );

    const ciDynamoRole = new iam.Role(this, "SubstackEmailSyncCIRole", {
      roleName: "SubstackEmailSyncCIRole",
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:asasmith/kara-substack-signup:*",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    ciDynamoRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:scan", "dynamodb:UpdateItem"],
        resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/SaturdayPaperEmailSubs`],
      }),
    );
  }
}
