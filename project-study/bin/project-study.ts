#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProjectStudyStack } from '../lib/project-study-stack';

const app = new cdk.App();
new ProjectStudyStack(app, 'ProjectStudyStack');
