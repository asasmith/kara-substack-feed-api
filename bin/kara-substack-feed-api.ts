#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { KaraSubstackFeedApiStack } from '../lib/kara-substack-feed-api-stack';
import { SubstackGithubDeployRoleStack } from '../lib/substack-github-deploy-role-stack';

const app = new cdk.App();
new SubstackGithubDeployRoleStack(app, 'SubstackGithubDeployRoleStack');
new KaraSubstackFeedApiStack(app, 'KaraSubstackFeedApiStack');
