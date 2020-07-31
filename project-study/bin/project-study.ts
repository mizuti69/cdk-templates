#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProjectStudyStack } from '../lib/project-study-dev-stack';

const app = new cdk.App();
new ProjectStudyStack(app, 'ProjectStudyStack', {
    // Stack description
    description: 'DevStack',
    env: {
        // Import aws account to current credential
        // Run stack aws account
        account: process.env.CDK_DEFAULT_ACCOUNT,
        // Run stack aws region
        region: process.env.CDK_DEFAULT_REGION,

    },
    // Add stack all tag 
    tags: {
        key: 'Group',
        value: 'study',
    }
});

// Stack with dependencies
/*
const vpc_stack = new VPCStack(app, 'VPCStack');
const alb_stack = new ALBStack(app, 'ALBStack', vpc_stack.vpc);
alb_stack.addDependency(vpc_stack);
*/

